import "server-only";
import type { FacStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { FacUserSession } from "./session";

/** Everything the request wizard needs to build its dynamic choices (active items only). */
export async function getWizardConfig() {
  const live = { active: true, archivedAt: null };
  const [buildings, categories, areaCategories] = await Promise.all([
    db.facBuilding.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: {
        floors: {
          where: live,
          orderBy: [{ sortOrder: "asc" }, { level: "desc" }],
          include: {
            wingLinks: { where: { active: true, wing: live }, orderBy: { sortOrder: "asc" }, include: { wing: true } },
            areas: { where: live, orderBy: { sortOrder: "asc" } },
            locations: { where: live, orderBy: [{ sortOrder: "asc" }, { code: "asc" }] },
          },
        },
      },
    }),
    db.facCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { issues: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    }),
    db.facAreaCategory.findMany({ select: { key: true, icon: true, nameEn: true, nameAr: true } }),
  ]);
  return {
    areaCategories,
    buildings: buildings.map((b) => ({
      id: b.id, code: b.code, nameEn: b.nameEn, nameAr: b.nameAr,
      floors: b.floors.map((f) => ({
        id: f.id, code: f.code, nameEn: f.nameEn, nameAr: f.nameAr, level: f.level, provisional: f.verification === "PROVISIONAL",
        wings: f.wingLinks.map((l) => ({ id: l.wing.id, code: l.wing.code, nameEn: l.wing.nameEn, nameAr: l.wing.nameAr, provisional: l.verification === "PROVISIONAL" })),
        areas: f.areas.map((a) => ({
          id: a.id, parentId: a.parentId, wingId: a.wingId, kind: a.kind, nameEn: a.nameEn, nameAr: a.nameAr, descEn: a.descEn, descAr: a.descAr,
          isOther: a.isOther, fields: a.fields, scopeNoteEn: a.scopeNoteEn, scopeNoteAr: a.scopeNoteAr, provisional: a.verification === "PROVISIONAL",
        })),
        locations: f.locations.map((l) => ({ id: l.id, areaId: l.areaId, wingId: l.wingId, kind: l.kind, code: l.code, nameEn: l.nameEn, nameAr: l.nameAr })),
      })),
    })),
    categories: categories.map((c) => ({
      id: c.id, key: c.key, service: c.service, nameEn: c.nameEn, nameAr: c.nameAr, icon: c.icon,
      issues: c.issues.map((i) => ({ id: i.id, nameEn: i.nameEn, nameAr: i.nameAr, areaKinds: i.areaKinds, floorCodes: i.floorCodes, defaultPriority: i.defaultPriority, safetyRisk: i.safetyRisk, active: i.active })),
    })),
  };
}
export type WizardConfig = Awaited<ReturnType<typeof getWizardConfig>>;

/** Which requests a user may see (enforced in every query). */
export function visibleWhere(user: FacUserSession): Prisma.FacRequestWhereInput {
  if (user.role === "AGENT" || user.role === "ADMIN") return {};
  if (user.role === "CONTRACTOR") return { teamId: user.teamId ?? "__none__" };
  return { employeeId: user.id };
}

const detailInclude = {
  category: true,
  issue: true,
  building: true,
  floor: true,
  wing: true,
  area: true,
  location: true,
  team: true,
  attachments: { orderBy: { createdAt: "asc" } },
  events: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.FacRequestInclude;

/** A request the user may open, or null. Employees never receive internal events. */
export async function getRequestForUser(user: FacUserSession, reference: string, asEmployee = false) {
  const where: Prisma.FacRequestWhereInput = asEmployee ? { reference, employeeId: user.id } : { reference, ...visibleWhere(user) };
  const r = await db.facRequest.findFirst({ where, include: detailInclude });
  if (!r) return null;
  if (asEmployee || user.role === "EMPLOYEE") r.events = r.events.filter((e) => !e.internal);
  return r;
}
export type RequestDetail = NonNullable<Awaited<ReturnType<typeof getRequestForUser>>>;

export async function myRecentRequests(userId: string, take = 3) {
  return db.facRequest.findMany({
    where: { employeeId: userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, reference: true, status: true, service: true, createdAt: true, locationLabelEn: true, locationLabelAr: true, issueOther: true, issue: { select: { nameEn: true, nameAr: true } } },
  });
}

/** Unread-style notifications for the header: latest public updates on the employee's open requests. */
export async function myNotifications(userId: string, take = 6) {
  return db.facRequestEvent.findMany({
    where: { internal: false, request: { employeeId: userId }, NOT: { actorId: userId } },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, type: true, status: true, createdAt: true, comment: true, request: { select: { reference: true } } },
  });
}

export const OPEN_STATUSES: FacStatus[] = ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "REOPENED"];
