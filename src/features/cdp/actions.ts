"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { MAX_UPLOAD_BYTES, THEMES } from "./config";
import { ImportError, importWorkbook } from "./parse";
import { XlsxError } from "./xlsx";
import { getUserCdpRaw } from "./data";

export type UploadState = { ok: boolean; message?: string; datasetId?: string; at?: number };

const refresh = () => {
  revalidatePath("/[locale]/cdp", "layout");
  revalidatePath("/[locale]/admin/(panel)/cdp", "page");
};

/** Upload: parse and validate, store as PENDING. The dashboard keeps showing the current file until an admin publishes. */
export async function uploadSurveyAction(_prev: UploadState, form: FormData): Promise<UploadState> {
  const me = await requireUser("ADMIN");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "uploadEmpty" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: "uploadTooLarge" };
  if (!/\.xlsx$/i.test(file.name)) return { ok: false, message: "uploadNotXlsx" };
  let parsed;
  try {
    parsed = importWorkbook(new Uint8Array(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof XlsxError) return { ok: false, message: e.code === "TOO_LARGE" ? "uploadTooLarge" : e.code === "NO_SHEET" ? "uploadNoSheet" : "uploadNotXlsx" };
    if (e instanceof ImportError) return { ok: false, message: `issue_${e.issue.code}` };
    throw e;
  }
  const fileName = file.name.replace(/[\u0000-\u001f]/g, "").slice(0, 200);
  const row = await db.surveyDataset.create({
    data: {
      fileName,
      fileSize: file.size,
      rowCount: parsed.dataset.responses.length,
      report: parsed.report as unknown as Prisma.InputJsonValue,
      data: parsed.dataset as unknown as Prisma.InputJsonValue,
      uploadedById: me.id,
      uploadedBy: me.name,
    },
  });
  await audit({ userId: me.id, action: "cdp.upload", entity: "surveyDataset", entityId: row.id, after: { fileName, rows: row.rowCount, errors: parsed.report.errors.length } });
  refresh();
  return { ok: true, message: parsed.report.errors.length ? "uploadHasErrors" : "uploadValidated", datasetId: row.id, at: Date.now() };
}

/** Publish a validated file: it replaces the results on the dashboard. Files with blocking errors cannot be published. */
export async function activateSurveyAction(id: string): Promise<UploadState> {
  const me = await requireUser("ADMIN");
  const row = await db.surveyDataset.findUnique({ where: { id }, select: { id: true, status: true, report: true, fileName: true } });
  if (!row) return { ok: false, message: "notFound" };
  const errors = (row.report as { errors?: unknown[] }).errors ?? [];
  if (errors.length) return { ok: false, message: "cannotActivate" };
  await db.$transaction([
    db.surveyDataset.updateMany({ where: { status: "ACTIVE" }, data: { status: "ARCHIVED" } }),
    db.surveyDataset.update({ where: { id }, data: { status: "ACTIVE", activatedAt: new Date() } }),
  ]);
  await audit({ userId: me.id, action: "cdp.activate", entity: "surveyDataset", entityId: id, after: { fileName: row.fileName } });
  refresh();
  return { ok: true, message: "activated", at: Date.now() };
}

export async function deleteSurveyAction(id: string): Promise<UploadState> {
  const me = await requireUser("ADMIN");
  const row = await db.surveyDataset.findUnique({ where: { id }, select: { status: true, fileName: true } });
  if (!row) return { ok: false, message: "notFound" };
  if (row.status === "ACTIVE") return { ok: false, message: "cannotDeleteActive" };
  await db.surveyDataset.delete({ where: { id } });
  await audit({ userId: me.id, action: "cdp.delete", entity: "surveyDataset", entityId: id, before: { fileName: row.fileName } });
  refresh();
  return { ok: true, message: "deleted", at: Date.now() };
}

/** Manual theme tags for one comment (authorised users only). Pass null to go back to the automatic themes. */
export async function setCommentThemesAction(key: string, themes: string[] | null): Promise<UploadState> {
  const me = await requireUser("VIEWER");
  if (!(await getUserCdpRaw(me))) return { ok: false, message: "forbidden" };
  if (typeof key !== "string" || !/^[a-f0-9]{20}$/.test(key)) return { ok: false, message: "notFound" };
  if (themes === null) {
    await db.surveyThemeTag.deleteMany({ where: { key } });
  } else {
    const valid = new Set(THEMES.map((t) => t.id));
    const clean = [...new Set((Array.isArray(themes) ? themes : []).filter((t) => typeof t === "string" && valid.has(t)))];
    await db.surveyThemeTag.upsert({ where: { key }, create: { key, themes: clean, updatedById: me.id }, update: { themes: clean, updatedById: me.id } });
  }
  await audit({ userId: me.id, action: "cdp.themes", entity: "surveyComment", entityId: key, after: { themes } });
  revalidatePath("/[locale]/cdp", "layout");
  return { ok: true, at: Date.now() };
}

/** Correct the list of people who supported participants (authorised users only). Pass null to undo. */
export async function setNameRuleAction(key: string, rule: { mergeInto?: string | null; label?: string | null; hidden?: boolean } | null): Promise<UploadState> {
  const me = await requireUser("VIEWER");
  if (!(await getUserCdpRaw(me))) return { ok: false, message: "forbidden" };
  const validKey = (k: unknown) => typeof k === "string" && k.length <= 120 && /^[a-z]*\|[a-z]*$/.test(k);
  if (!validKey(key)) return { ok: false, message: "notFound" };
  if (rule === null) {
    await db.surveyNameRule.deleteMany({ where: { key } });
  } else {
    const mergeInto = rule.mergeInto && validKey(rule.mergeInto) && rule.mergeInto !== key ? rule.mergeInto : null;
    const label = typeof rule.label === "string" && rule.label.trim() ? rule.label.trim().slice(0, 120) : null;
    const data = { mergeInto, label, hidden: !!rule.hidden, updatedById: me.id };
    await db.surveyNameRule.upsert({ where: { key }, create: { key, ...data }, update: data });
  }
  await audit({ userId: me.id, action: "cdp.names", entity: "surveyName", entityId: key, after: rule ?? { reset: true } });
  revalidatePath("/[locale]/cdp", "layout");
  return { ok: true, at: Date.now() };
}
