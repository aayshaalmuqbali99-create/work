"use server";

import { revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { saveImage, UploadError } from "@/lib/storage";
import type { FormState } from "@/features/admin/schemas";
import { readSite, siteSchema, DEFAULT_SITE } from "./schema";
import { SITE_TAG } from "./data";

/** Website appearance is admin-only. */
export async function saveSiteDraftAction(input: unknown): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const parsed = siteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "fixErrors" };
  const data = parsed.data as unknown as Prisma.InputJsonValue;
  const draft = await db.siteVersion.findFirst({ where: { status: "DRAFT" } });
  if (draft) await db.siteVersion.update({ where: { id: draft.id }, data: { data, createdById: user.id } });
  else await db.siteVersion.create({ data: { status: "DRAFT", data, createdById: user.id } });
  return { ok: true, message: "draftSaved", at: Date.now() };
}

export async function publishSiteAction(note: string): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const draft = await db.siteVersion.findFirst({ where: { status: "DRAFT" } });
  if (!draft) return { ok: false, message: "nothingToPublish" };
  const data = readSite(draft.data) as unknown as Prisma.InputJsonValue;
  await db.$transaction([
    db.siteVersion.updateMany({ where: { status: "PUBLISHED" }, data: { status: "ARCHIVED" } }),
    db.siteVersion.create({ data: { status: "PUBLISHED", data, note: note.slice(0, 200) || null, createdById: user.id, publishedAt: new Date() } }),
  ]);
  await audit({ userId: user.id, action: "site.publish", entity: "site", after: { note: note || null } });
  revalidateTag(SITE_TAG);
  return { ok: true, message: "sitePublished", at: Date.now() };
}

/** Copy an older version into the draft (nothing goes live until it is published again). */
export async function restoreSiteVersionAction(id: string): Promise<FormState> {
  await requireUser("ADMIN");
  const v = await db.siteVersion.findUnique({ where: { id } });
  if (!v) return { ok: false, message: "notFound" };
  return saveSiteDraftAction(readSite(v.data));
}

/** Throw away unpublished changes: the draft becomes the published (or default) content again. */
export async function discardSiteDraftAction(): Promise<FormState> {
  await requireUser("ADMIN");
  const pub = await db.siteVersion.findFirst({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } });
  return saveSiteDraftAction(pub ? readSite(pub.data) : DEFAULT_SITE);
}

export async function uploadLogoAction(form: FormData): Promise<{ ok: boolean; url?: string; width?: number; height?: number; message?: string }> {
  await requireUser("ADMIN");
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, message: "uploadEmpty" };
  try {
    const img = await saveImage(file);
    return { ok: true, url: img.url, width: img.width, height: img.height };
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: { TOO_LARGE: "uploadTooLarge", BAD_TYPE: "uploadBadType", EMPTY: "uploadEmpty" }[e.code] };
    throw e;
  }
}
