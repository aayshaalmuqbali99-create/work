"use server";

import { unlink } from "node:fs/promises";
import path from "node:path";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { GlbError, inspectGlb } from "@/lib/glb";
import { MAX_MODEL_BYTES, saveBinary, UPLOAD_DIR } from "@/lib/storage";
import { CATALOG_TAG } from "@/features/catalog/data";
import type { FormState } from "./schemas";

export async function uploadModelAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const deviceId = form.get("deviceId") as string;
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "uploadEmpty" };
  if (file.size > MAX_MODEL_BYTES) return { ok: false, message: "modelTooLarge" };
  const device = await db.device.findFirst({ where: { id: deviceId, deletedAt: null }, select: { id: true } });
  if (!device) return { ok: false, message: "notFound" };

  const buf = Buffer.from(await file.arrayBuffer());
  let info;
  try {
    info = inspectGlb(buf);
  } catch (e) {
    if (e instanceof GlbError) return { ok: false, message: `glb_${e.code}` };
    throw e;
  }
  const { url } = await saveBinary(buf, "models", "glb");
  const last = await db.device3DModel.findFirst({ where: { deviceId }, orderBy: { version: "desc" }, select: { version: true } });
  const parts = info.nodeNames.map((node, i) => ({ id: `p${i + 1}`, node, en: node, ar: "", fnEn: "", fnAr: "", parent: null, explode: null }));
  const model = await db.device3DModel.create({
    data: {
      deviceId, version: (last?.version ?? 0) + 1, fileUrl: url, fileName: file.name.slice(0, 200), fileSize: file.size,
      triangleCount: info.triangles, nodeNames: info.nodeNames, parts, createdById: user.id,
    },
  });
  await audit({ userId: user.id, action: "model.upload", entity: "device", entityId: deviceId, after: { version: model.version, file: model.fileName, triangles: info.triangles } });
  return { ok: true, message: "saved", at: Date.now(), redirectTo: `/admin/devices/${deviceId}/models/${model.id}` };
}

const vec = z.tuple([z.number().finite().min(-20).max(20), z.number().finite().min(-20).max(20), z.number().finite().min(-20).max(20)]);
const partSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  node: z.string().max(200),
  en: z.string().trim().max(120),
  ar: z.string().trim().max(120),
  fnEn: z.string().trim().max(600),
  fnAr: z.string().trim().max(600),
  parent: z.string().nullable(),
  explode: vec.nullable(),
});

export async function saveModelPartsAction(modelId: string, input: unknown): Promise<FormState> {
  const user = await requireUser();
  const model = await db.device3DModel.findUnique({ where: { id: modelId } });
  if (!model) return { ok: false, message: "notFound" };
  const parsed = z.array(partSchema).max(200).safeParse(input);
  if (!parsed.success) return { ok: false, message: "fixErrors" };
  const parts = parsed.data;
  const ids = new Set(parts.map((p) => p.id));
  const nodes = parts.map((p) => p.node);
  if (ids.size !== parts.length || new Set(nodes).size !== nodes.length) return { ok: false, message: "duplicateNode" };
  if (parts.some((p) => !model.nodeNames.includes(p.node) || (p.parent && (!ids.has(p.parent) || p.parent === p.id)))) return { ok: false, message: "fixErrors" };
  await db.device3DModel.update({ where: { id: modelId }, data: { parts: parts as unknown as Prisma.InputJsonValue } });
  await audit({ userId: user.id, action: "model.parts", entity: "device", entityId: model.deviceId, after: { version: model.version, parts: parts.length } });
  if (model.status === "PUBLISHED") revalidateTag(CATALOG_TAG);
  return { ok: true, message: "saved", at: Date.now() };
}

/** Publishing requires an explicit confirmation that the model shows the actual device. Archives the previous published version. */
export async function publishModelAction(modelId: string, confirmVerified: boolean): Promise<FormState> {
  const user = await requireUser();
  if (confirmVerified !== true) return { ok: false, message: "verifyRequired" };
  const model = await db.device3DModel.findUnique({ where: { id: modelId } });
  if (!model) return { ok: false, message: "notFound" };
  await db.$transaction([
    db.device3DModel.updateMany({ where: { deviceId: model.deviceId, status: "PUBLISHED", NOT: { id: modelId } }, data: { status: "ARCHIVED" } }),
    db.device3DModel.update({ where: { id: modelId }, data: { status: "PUBLISHED", verified: true, publishedAt: new Date() } }),
  ]);
  await audit({ userId: user.id, action: "model.publish", entity: "device", entityId: model.deviceId, after: { version: model.version, verified: true } });
  revalidateTag(CATALOG_TAG);
  return { ok: true, message: "modelPublished", at: Date.now() };
}

export async function unpublishModelAction(modelId: string): Promise<FormState> {
  const user = await requireUser();
  const model = await db.device3DModel.findUnique({ where: { id: modelId } });
  if (!model) return { ok: false, message: "notFound" };
  await db.device3DModel.update({ where: { id: modelId }, data: { status: "DRAFT" } });
  await audit({ userId: user.id, action: "model.unpublish", entity: "device", entityId: model.deviceId, after: { version: model.version } });
  revalidateTag(CATALOG_TAG);
  return { ok: true, at: Date.now() };
}

/** Only draft/archived versions can be deleted; the published one must be unpublished first. */
export async function deleteModelAction(modelId: string): Promise<FormState> {
  const user = await requireUser();
  const model = await db.device3DModel.findUnique({ where: { id: modelId } });
  if (!model || model.status === "PUBLISHED") return { ok: false, message: "forbidden" };
  await db.device3DModel.delete({ where: { id: modelId } });
  if (model.fileUrl.startsWith("/media/models/")) {
    const file = path.resolve(UPLOAD_DIR, model.fileUrl.slice("/media/".length));
    if (file.startsWith(UPLOAD_DIR + path.sep)) await unlink(file).catch(() => undefined);
  }
  await audit({ userId: user.id, action: "model.delete", entity: "device", entityId: model.deviceId, before: { version: model.version, file: model.fileName } });
  return { ok: true, at: Date.now() };
}
