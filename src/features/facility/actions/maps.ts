"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import sharp from "sharp";
import { db } from "@/lib/db";
import { deleteStored, saveBinary, saveImage, UploadError } from "@/lib/storage";
import { actionError, requireFac, type ActionResult } from "../server/guard";
import { facAudit } from "../server/audit";
import { validateSvg } from "../domain/svg";

const MAX_MAP_BYTES = 15 * 1024 * 1024;

export async function uploadMapAction(form: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireFac("config.manage");
    const floorId = String(form.get("floorId") ?? "");
    const wingId = String(form.get("wingId") ?? "") || null;
    const title = String(form.get("title") ?? "").trim().slice(0, 120);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "invalid" };
    if (file.size > MAX_MAP_BYTES) return { ok: false, error: "uploadTooLarge" };
    const floorRow = await db.facFloor.findUnique({ where: { id: floorId }, include: { wingLinks: true } });
    if (!floorRow) return { ok: false, error: "invalid" };
    if (wingId && !floorRow.wingLinks.some((l) => l.wingId === wingId)) return { ok: false, error: "invalid" };
    const buf = Buffer.from(await file.arrayBuffer());
    let stored: { key: string; width: number; height: number; contentType: string };
    const head = buf.subarray(0, 512).toString("utf8");
    if (/<svg[\s>]/i.test(head) || file.type === "image/svg+xml") {
      const size = validateSvg(buf.toString("utf8"));
      if (!size) return { ok: false, error: "uploadBadType" };
      const { key } = await saveBinary(buf, "facmaps", "svg");
      stored = { key, ...size, contentType: "image/svg+xml" };
    } else {
      try {
        await sharp(buf).metadata();
      } catch {
        return { ok: false, error: "uploadBadType" };
      }
      try {
        const img = await saveImage(file, "facmaps", 6000);
        stored = { key: img.key, width: img.width, height: img.height, contentType: "image/webp" };
      } catch (e) {
        if (e instanceof UploadError) return { ok: false, error: e.code === "TOO_LARGE" ? "uploadTooLarge" : "uploadBadType" };
        throw e;
      }
    }
    const map = await db.facFloorMap.create({ data: { floorId, wingId, title, storageKey: stored.key, contentType: stored.contentType, width: stored.width, height: stored.height } });
    await facAudit(user, "map.upload", "map", map.id, { floorId, title });
    revalidatePath("/[locale]/facility", "layout");
    return { ok: true, data: { id: map.id } };
  } catch (e) {
    return actionError(e);
  }
}

const markerSchema = z.object({
  id: z.string().max(40).optional(),
  kind: z.enum(["POINT", "ZONE"]),
  areaId: z.string().max(40).nullable(),
  locationId: z.string().max(40).nullable().default(null),
  labelEn: z.string().trim().max(80),
  labelAr: z.string().trim().max(80),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  points: z.array(z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)])).max(200).nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

/** Replace all markers of a map in one transaction (the editor saves the whole set). */
export async function saveMarkersAction(mapId: string, markers: unknown): Promise<ActionResult> {
  try {
    const user = await requireFac("config.manage");
    const parsed = z.array(markerSchema).max(500).safeParse(markers);
    if (!parsed.success) return { ok: false, error: "invalid" };
    const map = await db.facFloorMap.findUnique({ where: { id: mapId } });
    if (!map) return { ok: false, error: "invalid" };
    const areaIds = new Set((await db.facArea.findMany({ where: { floorId: map.floorId }, select: { id: true } })).map((a) => a.id));
    const locationIds = new Set((await db.facLocation.findMany({ where: { floorId: map.floorId }, select: { id: true } })).map((l) => l.id));
    await db.$transaction([
      db.facMapMarker.deleteMany({ where: { mapId } }),
      db.facMapMarker.createMany({
        data: parsed.data.map((m) => ({
          mapId, kind: m.kind, areaId: m.areaId && areaIds.has(m.areaId) ? m.areaId : null,
          locationId: m.locationId && locationIds.has(m.locationId) ? m.locationId : null, labelEn: m.labelEn, labelAr: m.labelAr,
          x: m.x, y: m.y, points: m.points ?? undefined, color: m.color,
        })),
      }),
    ]);
    await facAudit(user, "map.markers", "map", mapId, { count: parsed.data.length });
    revalidatePath("/[locale]/facility", "layout");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function setMapStatusAction(mapId: string, publish: boolean): Promise<ActionResult> {
  try {
    const user = await requireFac("config.manage");
    await db.facFloorMap.update({ where: { id: mapId }, data: { status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? new Date() : null } });
    await facAudit(user, publish ? "map.publish" : "map.unpublish", "map", mapId);
    revalidatePath("/[locale]/facility", "layout");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteMapAction(mapId: string): Promise<ActionResult> {
  try {
    const user = await requireFac("config.manage");
    const map = await db.facFloorMap.delete({ where: { id: mapId } });
    await deleteStored(`/media/${map.storageKey}`);
    await facAudit(user, "map.delete", "map", mapId);
    revalidatePath("/[locale]/facility", "layout");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
