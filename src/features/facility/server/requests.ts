import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { FacPriority, FacRole, FacService, FacStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site-url";
import { formatReference } from "../domain/reference";
import { computeDeadline } from "../domain/sla";
import { canTransition, FINISHED, STATUS_EMAIL } from "../domain/status";
import { locationLabel } from "../domain/location";
import { getCalendar, getSettings } from "./calendar";
import { enqueueEmail, requestLink } from "./notify";
import type { FacUserSession } from "./session";

type Tx = Prisma.TransactionClient;
export type Actor = { id: string | null; name: string; role: FacRole | "SYSTEM" };

const STATUS_LABEL: Record<"en" | "ar", Record<FacStatus, string>> = {
  en: { SUBMITTED: "Submitted", UNDER_REVIEW: "Under Review", ASSIGNED: "Assigned", IN_PROGRESS: "In Progress", ON_HOLD: "On Hold", RESOLVED: "Resolved", CLOSED: "Closed", REOPENED: "Reopened", CANCELLED: "Cancelled", REJECTED: "Rejected" },
  ar: { SUBMITTED: "مُقدَّم", UNDER_REVIEW: "قيد المراجعة", ASSIGNED: "تم الإسناد", IN_PROGRESS: "قيد التنفيذ", ON_HOLD: "معلّق", RESOLVED: "تم الحل", CLOSED: "مغلق", REOPENED: "أعيد فتحه", CANCELLED: "ملغى", REJECTED: "مرفوض" },
};
const loc = (l: string) => (l === "ar" ? "ar" : "en");

/** Atomically allocate the next number for the year (safe under concurrency). */
export async function allocateReference(tx: Tx, year: number): Promise<string> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "FacCounter" ("year", "value") VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE SET "value" = "FacCounter"."value" + 1
    RETURNING "value"`;
  return formatReference(year, rows[0].value);
}

/** Year in the business time zone (a request at 01:00 on 1 Jan Muscat time belongs to the new year). */
function businessYear(d: Date, timezone: string) {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric" }).format(d));
}

async function deadlines(tx: Tx, priority: FacPriority, from: Date) {
  const [policy, cal] = await Promise.all([tx.facSlaPolicy.findUnique({ where: { priority } }), getCalendar()]);
  if (!policy) return { responseDueAt: null, resolutionDueAt: null };
  return {
    responseDueAt: computeDeadline(from, policy.responseMinutes, policy.businessHoursOnly, cal),
    resolutionDueAt: computeDeadline(from, policy.resolutionMinutes, policy.businessHoursOnly, cal),
  };
}

/** First matching active routing rule. */
export async function findRoute(tx: Tx | typeof db, r: { service: FacService; categoryId: string | null; floorCode: string | null; areaKind: string | null }) {
  const rules = await tx.facRoutingRule.findMany({ where: { active: true, team: { active: true } }, orderBy: { sortOrder: "asc" }, include: { team: true } });
  return (
    rules.find(
      (x) =>
        (!x.service || x.service === r.service) &&
        (!x.categoryId || x.categoryId === r.categoryId) &&
        (!x.floorCode || x.floorCode === r.floorCode) &&
        (!x.areaKind || x.areaKind === r.areaKind) &&
        (x.team.kind === "INTERNAL" || x.team.scopeConfirmed),
    ) ?? null
  );
}

export type CreateInput = {
  service: FacService;
  floorId: string | null;
  wingId: string | null;
  areaId: string | null;
  locationId: string | null;
  otherLocation: string;
  detail: Record<string, string>;
  issueId: string | null;
  issueOther: string;
  description: string;
  priority: FacPriority;
  phone: string;
  department: string;
  safetyFlag: boolean;
  photos: { key: string; width: number; height: number }[];
};

export class RequestInputError extends Error {}

export async function createRequest(user: FacUserSession, input: CreateInput, opts: { isSample?: boolean; createdAt?: Date } = {}) {
  const settings = await getSettings();
  return db.$transaction(async (tx) => {
    // Re-validate the whole location against the live configuration (active, not archived).
    const live = { active: true, archivedAt: null };
    const floor = input.floorId
      ? await tx.facFloor.findFirst({ where: { id: input.floorId, ...live }, include: { building: true, wingLinks: { where: { active: true, wing: live }, include: { wing: true } } } })
      : null;
    if (input.floorId && !floor) throw new RequestInputError("floor");
    const wingLink = input.wingId ? floor?.wingLinks.find((l) => l.wingId === input.wingId) : null;
    if (input.wingId && !wingLink) throw new RequestInputError("wing");
    const wing = wingLink?.wing ?? null;
    const area = input.areaId ? await tx.facArea.findFirst({ where: { id: input.areaId, floorId: floor?.id ?? "-", ...live } }) : null;
    if (input.areaId && !area) throw new RequestInputError("area");
    if (area && wing && area.wingId && area.wingId !== wing.id) throw new RequestInputError("area");
    if (floor && !area) throw new RequestInputError("area");
    const location = input.locationId ? await tx.facLocation.findFirst({ where: { id: input.locationId, floorId: floor?.id ?? "-", ...live } }) : null;
    if (input.locationId && (!location || (location.areaId && location.areaId !== area?.id))) throw new RequestInputError("location");
    if ((!area || area.isOther) && input.otherLocation.trim().length < 5) throw new RequestInputError("location");
    const issue = input.issueId ? await tx.facIssue.findFirst({ where: { id: input.issueId, active: true, category: { service: input.service, active: true } } }) : null;
    if (input.issueId && !issue) throw new RequestInputError("issue");
    if (!issue && input.issueOther.trim().length < 3) throw new RequestInputError("issue");

    // Only keep detail fields this area asks for, plus the free description ("other").
    const allowed = new Set([...(area?.fields ?? []), "other"]);
    const detail = Object.fromEntries(Object.entries(input.detail).filter(([k, v]) => allowed.has(k) && v.trim()).map(([k, v]) => [k, v.trim().slice(0, 120)]));
    if (input.otherLocation.trim()) detail.other = input.otherLocation.trim().slice(0, 300);

    // Snapshot of the location as text: kept on the request even if the configuration is renamed or archived later.
    const L = {
      en: { office: "Office", room: "Room", parkingSpace: "Space", column: "Column", entrance: "Entrance" },
      ar: { office: "مكتب", room: "غرفة", parkingSpace: "موقف", column: "عمود", entrance: "مدخل" },
    } as const;
    const detailText = (lang: "en" | "ar") => {
      const parts: string[] = [];
      if (location) parts.push([lang === "ar" ? location.nameAr || location.nameEn : location.nameEn || location.nameAr, location.code].filter(Boolean).join(" "));
      if (detail.office) parts.push(`${L[lang].office} ${detail.office}`);
      if (detail.room) parts.push(`${L[lang].room} ${detail.room}`);
      if (detail.meetingRoom) parts.push(detail.meetingRoom);
      if (detail.parkingSpace) parts.push(`${L[lang].parkingSpace} ${detail.parkingSpace}`);
      if (detail.column) parts.push(`${L[lang].column} ${detail.column}`);
      if (detail.elevator) parts.push(detail.elevator);
      if (detail.entrance) parts.push(`${L[lang].entrance} ${detail.entrance}`);
      if (detail.landmark) parts.push(detail.landmark);
      if (detail.other) parts.push(detail.other);
      return parts;
    };
    const locationLabelEn = locationLabel([floor?.building.nameEn, floor?.nameEn, wing?.nameEn, area && !area.isOther ? area.nameEn : null, ...detailText("en")]);
    const locationLabelAr = locationLabel([floor?.building.nameAr, floor?.nameAr, wing?.nameAr, area && !area.isOther ? area.nameAr : null, ...detailText("ar")]);

    const createdAt = opts.createdAt ?? new Date();
    const priority: FacPriority = input.safetyFlag && input.priority !== "EMERGENCY" ? "HIGH" : input.priority;
    const reference = await allocateReference(tx, businessYear(createdAt, settings.timezone));
    const due = await deadlines(tx, priority, createdAt);
    const route = await findRoute(tx, { service: input.service, categoryId: issue?.categoryId ?? null, floorCode: floor?.code ?? null, areaKind: area?.kind ?? null });
    const autoTeam = route?.autoAssign ? route.team : null;

    const req = await tx.facRequest.create({
      data: {
        reference,
        employeeId: user.id,
        employeeName: user.name,
        employeeEmail: user.email,
        contactPhone: input.phone.trim().slice(0, 40),
        department: (input.department || user.department).trim().slice(0, 120),
        service: input.service,
        categoryId: issue?.categoryId ?? null,
        issueId: issue?.id ?? null,
        issueOther: issue ? "" : input.issueOther.trim().slice(0, 200),
        buildingId: floor?.buildingId ?? null,
        floorId: floor?.id ?? null,
        wingId: wing?.id ?? null,
        areaId: area?.id ?? null,
        locationId: location?.id ?? null,
        locationLabelEn,
        locationLabelAr,
        locationDetail: detail,
        description: input.description.trim().slice(0, 4000),
        priority,
        safetyFlag: input.safetyFlag,
        status: autoTeam ? "ASSIGNED" : "SUBMITTED",
        teamId: autoTeam?.id ?? null,
        ...due,
        isSample: !!opts.isSample,
        createdAt,
        attachments: { create: input.photos.map((p) => ({ storageKey: p.key, width: p.width, height: p.height, kind: "REPORT" as const, uploadedById: user.id, createdAt })) },
      },
    });
    await tx.facRequestEvent.create({ data: { requestId: req.id, type: "STATUS", status: "SUBMITTED", actorId: user.id, actorName: user.name, actorRole: user.role, createdAt } });
    if (autoTeam) {
      await tx.facRequestEvent.create({
        data: { requestId: req.id, type: "ASSIGN", status: "ASSIGNED", actorName: "Facility Hub", actorRole: "SYSTEM", comment: "", data: { teamId: autoTeam.id, teamEn: autoTeam.nameEn, teamAr: autoTeam.nameAr }, createdAt },
      });
    }
    const l = loc(user.locale);
    if (!opts.isSample) {
      await enqueueEmail(tx, {
        to: user.email,
        templateKey: "SUBMITTED",
        locale: l,
        requestId: req.id,
        vars: { name: user.name, reference, location: l === "ar" ? locationLabelAr : locationLabelEn, status: STATUS_LABEL[l].SUBMITTED, link: requestLink(l, reference) },
      });
      if (autoTeam?.email) await notifyTeam(tx, req.id, autoTeam.email, reference, locationLabelEn);
    }
    return req;
  });
}

async function notifyTeam(tx: Tx, requestId: string, email: string, reference: string, location: string) {
  await enqueueEmail(tx, {
    to: email,
    templateKey: "ASSIGNED",
    locale: "en",
    requestId,
    vars: { name: "Team", reference, location, status: STATUS_LABEL.en.ASSIGNED, link: `${SITE_URL}/en/facility/ops/requests/${reference}` },
  });
}

/** Create single-use confirm / reopen links for the "resolved" e-mail. */
async function actionLinks(tx: Tx, requestId: string, locale: string) {
  const links: Record<string, string> = {};
  for (const purpose of ["CONFIRM", "REOPEN"] as const) {
    const token = randomBytes(24).toString("base64url");
    await tx.facActionToken.create({ data: { id: createHash("sha256").update(token).digest("hex"), requestId, purpose, expiresAt: new Date(Date.now() + 14 * 864e5) } });
    links[purpose] = `${SITE_URL}/${locale}/facility/action?t=${token}`;
  }
  return links;
}

export class TransitionError extends Error {}

/** The single place that changes a request's status (ops, contractor, employee and system). */
export async function changeStatus(requestId: string, to: FacStatus, actor: Actor, opts: { comment?: string; internal?: boolean; employeeAction?: boolean; infoRequired?: boolean } = {}) {
  return db.$transaction(async (tx) => {
    const r = await tx.facRequest.findUniqueOrThrow({ where: { id: requestId }, include: { employee: true, team: true } });
    if (!opts.employeeAction) {
      if (actor.role === "SYSTEM" || actor.role === "EMPLOYEE" || !canTransition(actor.role, r.status, to)) throw new TransitionError(`${r.status}->${to}`);
    }
    const now = new Date();
    const data: Prisma.FacRequestUpdateInput = { status: to };
    if (!r.firstResponseAt && actor.role !== "EMPLOYEE" && actor.role !== "SYSTEM") data.firstResponseAt = now;
    if (to === "RESOLVED") data.resolvedAt = now;
    if (to === "CLOSED") data.closedAt = now;
    if (to === "REOPENED") {
      data.reopenCount = { increment: 1 };
      data.resolvedAt = null;
      data.closedAt = null;
      data.overdueNotifiedAt = null;
      const due = await deadlines(tx, r.priority, now);
      Object.assign(data, due);
    }
    await tx.facRequest.update({ where: { id: r.id }, data });
    await tx.facRequestEvent.create({
      data: { requestId: r.id, type: "STATUS", status: to, actorId: actor.id, actorName: actor.name, actorRole: actor.role, comment: (opts.comment ?? "").slice(0, 2000), internal: !!opts.internal },
    });

    const l = loc(r.employee.locale);
    const tplKey = opts.infoRequired ? "INFO_REQUIRED" : STATUS_EMAIL[to];
    // Employees don't get an e-mail for their own actions (except confirmation of closure).
    if (tplKey && !(opts.employeeAction && to !== "CLOSED") && !r.isSample) {
      const vars = {
        name: r.employeeName,
        reference: r.reference,
        location: l === "ar" ? r.locationLabelAr : r.locationLabelEn,
        status: STATUS_LABEL[l][to],
        link: requestLink(l, r.reference),
        comment: opts.internal ? "" : (opts.comment ?? ""),
        team: r.team ? (l === "ar" ? r.team.nameAr : r.team.nameEn) : "",
      };
      let actions;
      if (to === "RESOLVED") {
        const links = await actionLinks(tx, r.id, l);
        actions = [
          { label: l === "ar" ? "نعم، تم الإصلاح" : "Yes, it's fixed", url: links.CONFIRM, tone: "primary" as const },
          { label: l === "ar" ? "لا، أعد فتح الطلب" : "No, reopen it", url: links.REOPEN, tone: "secondary" as const },
        ];
      }
      await enqueueEmail(tx, { to: r.employeeEmail, templateKey: tplKey, locale: l, requestId: r.id, vars, actions });
    }
    return r;
  });
}

export async function assignTeam(requestId: string, teamId: string, actor: Actor, comment = "") {
  return db.$transaction(async (tx) => {
    const r = await tx.facRequest.findUniqueOrThrow({ where: { id: requestId }, include: { employee: true } });
    if (FINISHED.has(r.status)) throw new TransitionError("finished");
    const team = await tx.facTeam.findFirst({ where: { id: teamId, active: true } });
    if (!team || (team.kind === "CONTRACTOR" && !team.scopeConfirmed)) throw new TransitionError("team");
    const moveToAssigned = ["SUBMITTED", "UNDER_REVIEW", "REOPENED"].includes(r.status);
    await tx.facRequest.update({
      where: { id: r.id },
      data: { teamId: team.id, status: moveToAssigned ? "ASSIGNED" : r.status, firstResponseAt: r.firstResponseAt ?? new Date() },
    });
    await tx.facRequestEvent.create({
      data: {
        requestId: r.id, type: "ASSIGN", status: moveToAssigned ? "ASSIGNED" : null, actorId: actor.id, actorName: actor.name, actorRole: actor.role,
        comment: comment.slice(0, 2000), data: { teamId: team.id, teamEn: team.nameEn, teamAr: team.nameAr },
      },
    });
    if (!r.isSample) {
      const l = loc(r.employee.locale);
      if (moveToAssigned) {
        await enqueueEmail(tx, {
          to: r.employeeEmail, templateKey: "ASSIGNED", locale: l, requestId: r.id,
          vars: { name: r.employeeName, reference: r.reference, location: l === "ar" ? r.locationLabelAr : r.locationLabelEn, status: STATUS_LABEL[l].ASSIGNED, link: requestLink(l, r.reference), team: l === "ar" ? team.nameAr : team.nameEn },
        });
      }
      if (team.email) await notifyTeam(tx, r.id, team.email, r.reference, r.locationLabelEn);
    }
  });
}

export async function setPriority(requestId: string, priority: FacPriority, actor: Actor) {
  return db.$transaction(async (tx) => {
    const r = await tx.facRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (r.priority === priority) return;
    const due = FINISHED.has(r.status) ? {} : await deadlines(tx, priority, r.createdAt);
    await tx.facRequest.update({ where: { id: r.id }, data: { priority, ...due, overdueNotifiedAt: null } });
    await tx.facRequestEvent.create({ data: { requestId: r.id, type: "PRIORITY", actorId: actor.id, actorName: actor.name, actorRole: actor.role, internal: true, data: { from: r.priority, to: priority } } });
  });
}

export async function escalate(requestId: string, actor: Actor, reason: string) {
  return db.$transaction(async (tx) => {
    const r = await tx.facRequest.update({ where: { id: requestId }, data: { escalationLevel: { increment: 1 } } });
    await tx.facRequestEvent.create({ data: { requestId: r.id, type: "ESCALATE", actorId: actor.id, actorName: actor.name, actorRole: actor.role, internal: true, comment: reason.slice(0, 2000), data: { level: r.escalationLevel } } });
    await notifyOps(tx, "ESCALATED", r, reason);
  });
}

/** Escalation / overdue e-mails go to the configured recipients, or to every active Facility Operations admin. */
export async function notifyOps(tx: Tx, templateKey: string, r: { id: string; reference: string; locationLabelEn: string; status: FacStatus; isSample: boolean }, comment = "") {
  if (r.isSample) return;
  const s = await tx.facSettings.findUnique({ where: { id: 1 } });
  let to = (s?.escalationEmails ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (to.length === 0) to = (await tx.facUser.findMany({ where: { role: "ADMIN", active: true }, select: { email: true } })).map((u) => u.email);
  for (const email of to) {
    await enqueueEmail(tx, {
      to: email, templateKey, locale: "en", requestId: r.id,
      vars: { name: "Facility Operations", reference: r.reference, location: r.locationLabelEn, status: STATUS_LABEL.en[r.status], comment, link: `${SITE_URL}/en/facility/ops/requests/${r.reference}` },
    });
  }
}

export async function addComment(requestId: string, actor: Actor, text: string, internal: boolean) {
  await db.facRequestEvent.create({ data: { requestId, type: "COMMENT", actorId: actor.id, actorName: actor.name, actorRole: actor.role, comment: text.slice(0, 2000), internal } });
}

/** SLA sweep: e-mails Facility Operations once per overdue request. Run from the jobs endpoint. */
export async function sweepOverdue(now = new Date()) {
  const overdue = await db.facRequest.findMany({
    where: { status: { notIn: [...FINISHED] }, resolutionDueAt: { lt: now }, overdueNotifiedAt: null, isSample: false },
    take: 200,
  });
  for (const r of overdue) {
    await db.$transaction(async (tx) => {
      await tx.facRequest.update({ where: { id: r.id }, data: { overdueNotifiedAt: now } });
      await tx.facRequestEvent.create({ data: { requestId: r.id, type: "ESCALATE", actorName: "Facility Hub", actorRole: "SYSTEM", internal: true, comment: "Resolution target passed" } });
      await notifyOps(tx, "OVERDUE", r);
    });
  }
  return overdue.length;
}

export const actorOf = (u: FacUserSession): Actor => ({ id: u.id, name: u.name, role: u.role });
