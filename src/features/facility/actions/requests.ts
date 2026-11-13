"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { saveImage, UploadError } from "@/lib/storage";
import { MAX_PHOTOS, MAX_PHOTO_MB } from "../constants";
import { detectSafetyRisks } from "../domain/safety";
import { employeeCanCancel, employeeCanConfirm, employeeCanReopen } from "../domain/status";
import { actionError, requireFac, type ActionResult } from "../server/guard";
import { getSettings } from "../server/calendar";
import { addComment, changeStatus, createRequest, RequestInputError } from "../server/requests";
import { processOutbox } from "../server/notify";
import { facAudit } from "../server/audit";
import { getFacUser } from "../server/session";

const deliverSoon = () => after(() => processOutbox().catch((e) => console.error("[facility-mail]", e)));

const payloadSchema = z.object({
  service: z.enum(["MAINTENANCE", "CLEANING"]),
  floorId: z.string().max(40).nullable(),
  areaId: z.string().max(40).nullable(),
  otherLocation: z.string().max(300).default(""),
  detail: z.record(z.string().max(30), z.string().max(120)).default({}),
  issueId: z.string().max(40).nullable(),
  issueOther: z.string().max(200).default(""),
  description: z.string().trim().min(10).max(4000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]),
  phone: z.string().trim().max(40).regex(/^[+\d\s()-]*$/).default(""),
  department: z.string().trim().max(120).default(""),
  safetyAcknowledged: z.boolean().default(false),
});

export async function submitRequestAction(form: FormData): Promise<ActionResult<{ reference: string }>> {
  try {
    const user = await requireFac("request.create");
    const limited = await rateLimit(`fac-submit:${user.id}`, 15, 60 * 60_000);
    if (!limited.ok) return { ok: false, error: "tooMany" };
    let raw: unknown;
    try {
      raw = JSON.parse(String(form.get("payload") ?? ""));
    } catch {
      return { ok: false, error: "invalid" };
    }
    const parsed = payloadSchema.safeParse(raw);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const i of parsed.error.issues) fields[String(i.path[0])] = i.code;
      return { ok: false, error: "invalid", fields };
    }
    const p = parsed.data;

    const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > MAX_PHOTOS) return { ok: false, error: "invalid" };
    if (files.some((f) => f.size > MAX_PHOTO_MB * 1024 * 1024)) return { ok: false, error: "uploadTooLarge" };
    const photos = [];
    for (const f of files) {
      try {
        const img = await saveImage(f, "facility", 2000);
        photos.push({ key: img.key, width: img.width, height: img.height });
      } catch (e) {
        if (e instanceof UploadError) return { ok: false, error: e.code === "TOO_LARGE" ? "uploadTooLarge" : "uploadBadType" };
        throw e;
      }
    }

    const issue = p.issueId ? await db.facIssue.findUnique({ where: { id: p.issueId }, select: { safetyRisk: true } }) : null;
    const safetyFlag = !!issue?.safetyRisk || detectSafetyRisks(`${p.description} ${p.issueOther}`).length > 0 || p.priority === "EMERGENCY";

    const req = await createRequest(user, { ...p, safetyFlag, photos });
    await facAudit(user, "request.create", "request", req.id, { reference: req.reference });
    deliverSoon();
    revalidatePath("/[locale]/facility", "layout");
    return { ok: true, data: { reference: req.reference } };
  } catch (e) {
    if (e instanceof RequestInputError) return { ok: false, error: "invalid", fields: { [e.message]: "invalid" } };
    return actionError(e);
  }
}

async function ownRequest(reference: string) {
  const user = await requireFac();
  const r = await db.facRequest.findFirst({ where: { reference, employeeId: user.id } });
  return { user, r };
}

const text = (v: FormDataEntryValue | null, max = 2000) => String(v ?? "").trim().slice(0, max);

export async function employeeCommentAction(reference: string, comment: string): Promise<ActionResult> {
  try {
    const { user, r } = await ownRequest(reference);
    if (!r) return { ok: false, error: "forbidden" };
    const c = text(comment);
    if (c.length < 2) return { ok: false, error: "invalid" };
    if (!(await rateLimit(`fac-comment:${user.id}`, 30, 60 * 60_000)).ok) return { ok: false, error: "tooMany" };
    await addComment(r.id, { id: user.id, name: user.name, role: "EMPLOYEE" }, c, false);
    revalidatePath(`/[locale]/facility/requests/${reference}`, "page");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function employeeDecisionAction(reference: string, decision: "confirm" | "reopen" | "cancel", reason = ""): Promise<ActionResult> {
  try {
    const { user, r } = await ownRequest(reference);
    if (!r) return { ok: false, error: "forbidden" };
    const s = await getSettings();
    const actor = { id: user.id, name: user.name, role: "EMPLOYEE" as const };
    if (decision === "confirm" && employeeCanConfirm(r.status)) await changeStatus(r.id, "CLOSED", actor, { employeeAction: true });
    else if (decision === "reopen" && employeeCanReopen(r.status, r.resolvedAt, s.reopenDays)) {
      if (text(reason).length < 3) return { ok: false, error: "invalid" };
      await changeStatus(r.id, "REOPENED", actor, { employeeAction: true, comment: text(reason) });
    } else if (decision === "cancel" && employeeCanCancel(r.status)) await changeStatus(r.id, "CANCELLED", actor, { employeeAction: true, comment: text(reason) });
    else return { ok: false, error: "forbidden" };
    await facAudit(user, `request.${decision}`, "request", r.id, { reference });
    deliverSoon();
    revalidatePath(`/[locale]/facility/requests/${reference}`, "page");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function feedbackAction(reference: string, rating: number, comment: string): Promise<ActionResult> {
  try {
    const { user, r } = await ownRequest(reference);
    if (!r || !["RESOLVED", "CLOSED"].includes(r.status) || r.rating) return { ok: false, error: "forbidden" };
    const n = Math.round(Number(rating));
    if (!(n >= 1 && n <= 5)) return { ok: false, error: "invalid" };
    await db.$transaction([
      db.facRequest.update({ where: { id: r.id }, data: { rating: n, feedback: text(comment, 1000) } }),
      db.facRequestEvent.create({ data: { requestId: r.id, type: "FEEDBACK", actorId: user.id, actorName: user.name, actorRole: "EMPLOYEE", comment: text(comment, 1000), data: { rating: n } } }),
    ]);
    revalidatePath(`/[locale]/facility/requests/${reference}`, "page");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

/**
 * Confirm / reopen through a single-use e-mail link. The link opens a page; this POST action does the change,
 * so mail scanners that prefetch links cannot act on the employee's behalf.
 */
export async function redeemActionTokenAction(token: string, reason = ""): Promise<ActionResult<{ reference: string; purpose: string }>> {
  try {
    const id = createHash("sha256").update(String(token)).digest("hex");
    const t = await db.facActionToken.findUnique({ where: { id }, include: { request: true } });
    if (!t || t.usedAt || t.expiresAt < new Date()) return { ok: false, error: "expired" };
    const me = await getFacUser();
    if (me && me.id !== t.request.employeeId) return { ok: false, error: "forbidden" };
    const r = t.request;
    const actor = { id: r.employeeId, name: r.employeeName, role: "EMPLOYEE" as const };
    const s = await getSettings();
    if (t.purpose === "CONFIRM" && employeeCanConfirm(r.status)) await changeStatus(r.id, "CLOSED", actor, { employeeAction: true });
    else if (t.purpose === "REOPEN" && employeeCanReopen(r.status, r.resolvedAt, s.reopenDays)) await changeStatus(r.id, "REOPENED", actor, { employeeAction: true, comment: text(reason) });
    else return { ok: false, error: "expired" };
    await db.facActionToken.updateMany({ where: { requestId: r.id, usedAt: null }, data: { usedAt: new Date() } });
    await facAudit({ id: r.employeeId, name: r.employeeName }, `request.email_${t.purpose.toLowerCase()}`, "request", r.id);
    deliverSoon();
    return { ok: true, data: { reference: r.reference, purpose: t.purpose } };
  } catch (e) {
    return actionError(e);
  }
}
