"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FacPriority, FacStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { deleteStored, saveImage, UploadError } from "@/lib/storage";
import { can } from "../domain/permissions";
import { actionError, requireFac, type ActionResult } from "../server/guard";
import { actorOf, addComment, assignTeam, changeStatus, escalate, setPriority, TransitionError } from "../server/requests";
import { processOutbox } from "../server/notify";
import { facAudit } from "../server/audit";
import { visibleWhere } from "../server/queries";

const deliverSoon = () => after(() => processOutbox().catch((e) => console.error("[facility-mail]", e)));
const refresh = (ref: string) => {
  revalidatePath(`/[locale]/facility/ops`, "layout");
  revalidatePath(`/[locale]/facility/requests/${ref}`, "page");
};

/** Loads a request the operator/contractor may act on (contractors: own team only). */
async function load(id: string) {
  const user = await requireFac("ops.view");
  const r = await db.facRequest.findFirst({ where: { id, ...visibleWhere(user) } });
  if (!r) throw new TransitionError("not visible");
  return { user, r };
}

const fail = (e: unknown): ActionResult<never> => (e instanceof TransitionError ? { ok: false, error: "transition" } : actionError(e));

export async function opsStatusAction(id: string, to: FacStatus, comment: string, opts: { internal?: boolean; infoRequired?: boolean } = {}): Promise<ActionResult> {
  try {
    const { user, r } = await load(id);
    if (to === "RESOLVED" && comment.trim().length < 3) return { ok: false, error: "invalid" };
    await changeStatus(r.id, to, actorOf(user), { comment: comment.trim(), internal: !!opts.internal, infoRequired: opts.infoRequired });
    await facAudit(user, "request.status", "request", r.id, { from: r.status, to });
    deliverSoon();
    refresh(r.reference);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function opsAssignAction(id: string, teamId: string, comment = ""): Promise<ActionResult> {
  try {
    const { user, r } = await load(id);
    if (!can(user.role, "ops.assign")) return { ok: false, error: "forbidden" };
    await assignTeam(r.id, teamId, actorOf(user), comment);
    await facAudit(user, "request.assign", "request", r.id, { teamId });
    deliverSoon();
    refresh(r.reference);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function opsPriorityAction(id: string, priority: FacPriority): Promise<ActionResult> {
  try {
    const { user, r } = await load(id);
    if (!can(user.role, "ops.manageAll")) return { ok: false, error: "forbidden" };
    if (!["LOW", "MEDIUM", "HIGH", "EMERGENCY"].includes(priority)) return { ok: false, error: "invalid" };
    await setPriority(r.id, priority, actorOf(user));
    await facAudit(user, "request.priority", "request", r.id, { from: r.priority, to: priority });
    refresh(r.reference);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function opsEscalateAction(id: string, reason: string): Promise<ActionResult> {
  try {
    const { user, r } = await load(id);
    if (!can(user.role, "ops.manageAll")) return { ok: false, error: "forbidden" };
    if (reason.trim().length < 3) return { ok: false, error: "invalid" };
    await escalate(r.id, actorOf(user), reason.trim());
    await facAudit(user, "request.escalate", "request", r.id);
    deliverSoon();
    refresh(r.reference);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function opsNoteAction(id: string, text: string, internal: boolean): Promise<ActionResult> {
  try {
    const { user, r } = await load(id);
    if (text.trim().length < 2) return { ok: false, error: "invalid" };
    await addComment(r.id, actorOf(user), text.trim(), internal);
    refresh(r.reference);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function opsCompletionPhotoAction(id: string, form: FormData): Promise<ActionResult> {
  try {
    const { user, r } = await load(id);
    const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 5);
    for (const f of files) {
      try {
        const img = await saveImage(f, "facility", 2000);
        await db.facAttachment.create({ data: { requestId: r.id, storageKey: img.key, width: img.width, height: img.height, kind: "COMPLETION", uploadedById: user.id } });
      } catch (e) {
        if (e instanceof UploadError) return { ok: false, error: e.code === "TOO_LARGE" ? "uploadTooLarge" : "uploadBadType" };
        throw e;
      }
    }
    await db.facRequestEvent.create({ data: { requestId: r.id, type: "PHOTO", actorId: user.id, actorName: user.name, actorRole: user.role, data: { count: files.length } } });
    refresh(r.reference);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Remove every request flagged as sample data (configuration is kept). */
export async function purgeSampleRequestsAction(): Promise<ActionResult> {
  try {
    const user = await requireFac("config.manage");
    const atts = await db.facAttachment.findMany({ where: { request: { isSample: true } }, select: { storageKey: true } });
    const { count } = await db.facRequest.deleteMany({ where: { isSample: true } });
    for (const a of atts) await deleteStored(`/media/${a.storageKey}`);
    await facAudit(user, "sample.purge", "request", null, { count });
    revalidatePath(`/[locale]/facility`, "layout");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function processOutboxAction(): Promise<ActionResult<{ sent: number; failed: number }>> {
  try {
    await requireFac("config.manage");
    const res = await processOutbox(100);
    revalidatePath(`/[locale]/facility/ops/emails`, "page");
    return { ok: true, data: res };
  } catch (e) {
    return actionError(e);
  }
}

const bulkSchema = z.object({ ids: z.array(z.string().max(40)).min(1).max(100), teamId: z.string().max(40) });
export async function opsBulkAssignAction(ids: string[], teamId: string): Promise<ActionResult> {
  try {
    const user = await requireFac("ops.assign");
    const p = bulkSchema.safeParse({ ids, teamId });
    if (!p.success) return { ok: false, error: "invalid" };
    for (const id of p.data.ids) await assignTeam(id, p.data.teamId, actorOf(user)).catch(() => {});
    deliverSoon();
    revalidatePath(`/[locale]/facility/ops`, "layout");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
