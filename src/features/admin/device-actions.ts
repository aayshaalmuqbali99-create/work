"use server";

import { revalidateTag } from "next/cache";
import { getLocale } from "next-intl/server";
import { Prisma, type DeviceStatus } from "@prisma/client";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { saveImage, UploadError } from "@/lib/storage";
import { slugify } from "@/lib/slug";
import { CATALOG_TAG } from "@/features/catalog/data";
import inventory from "@/data/inventory-rows.json";
import { deviceSchema, fieldErrors, type FormState } from "./schemas";

const FIELDS = ["nameEn", "nameAr", "brand", "model", "slug", "archetype", "condition", "quantity", "marketPriceOMR", "descEn", "descAr", "usesEn", "usesAr", "benefitsEn", "benefitsAr", "categoryId"] as const;

function readForm(form: FormData) {
  const get = (k: string) => (form.get(k) ?? "") as string;
  return deviceSchema.safeParse({
    nameEn: get("nameEn"), nameAr: get("nameAr"), brand: get("brand"), model: get("model"), slug: get("slug"),
    categoryKey: get("categoryKey"), archetype: get("archetype"), condition: get("condition"),
    quantity: get("quantity"), quantityReason: get("quantityReason"), marketPrice: get("marketPrice"),
    descEn: get("descEn"), descAr: get("descAr"), usesEn: get("usesEn"), usesAr: get("usesAr"),
    benefitsEn: get("benefitsEn"), benefitsAr: get("benefitsAr"),
  });
}

/** Only the fields that actually changed, for the audit log. */
function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const k of FIELDS) {
    const x = before[k] instanceof Prisma.Decimal ? String(before[k]) : before[k];
    const y = after[k] instanceof Prisma.Decimal ? String(after[k]) : after[k];
    if (JSON.stringify(x ?? null) !== JSON.stringify(y ?? null)) {
      b[k] = x ?? null;
      a[k] = y ?? null;
    }
  }
  return { before: b, after: a, changed: Object.keys(a).length > 0 };
}

async function uniqueSlug(base: string, exceptId?: string) {
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = await db.device.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === exceptId) return slug;
    slug = `${base}-${i}`;
  }
}

/** Create (id empty) or update a device. */
export async function saveDeviceAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = (form.get("id") as string) || null;
  const parsed = readForm(form);
  if (!parsed.success) return { ok: false, message: "fixErrors", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const category = v.categoryKey ? await db.category.findUnique({ where: { key: v.categoryKey } }) : null;
  const data = {
    nameEn: v.nameEn, nameAr: v.nameAr, brand: v.brand, model: v.model,
    archetype: v.archetype || null, condition: v.condition,
    marketPriceOMR: v.marketPrice == null ? null : new Prisma.Decimal(v.marketPrice),
    descEn: v.descEn, descAr: v.descAr, usesEn: v.usesEn, usesAr: v.usesAr, benefitsEn: v.benefitsEn, benefitsAr: v.benefitsAr,
    categoryId: category?.id ?? null,
  };

  if (!id) {
    const slug = await uniqueSlug(v.slug || slugify(v.nameEn));
    const created = await db.device.create({
      data: {
        ...data, slug, status: "DRAFT", quantity: v.quantity,
        inventory: v.quantity > 0 ? { create: [{ type: "ADJUSTMENT", delta: v.quantity, quantityAfter: v.quantity, reason: v.quantityReason || "Initial stock", userId: user.id }] } : undefined,
      },
    });
    await audit({ userId: user.id, action: "device.create", entity: "device", entityId: created.id, after: { ...data, marketPriceOMR: v.marketPrice, slug, quantity: v.quantity } as Prisma.InputJsonValue });
    revalidateTag(CATALOG_TAG);
    redirect({ href: `/admin/devices/${created.id}`, locale: await getLocale() });
  }

  const existing = await db.device.findFirst({ where: { id: id!, deletedAt: null } });
  if (!existing) return { ok: false, message: "notFound" };
  if (v.slug && v.slug !== existing.slug) {
    const taken = await db.device.findUnique({ where: { slug: v.slug }, select: { id: true } });
    if (taken && taken.id !== existing.id) return { ok: false, message: "fixErrors", fieldErrors: { slug: "slugTaken" } };
  }
  const slug = v.slug || existing.slug;
  const delta = v.quantity - existing.quantity;

  const updated = await db.$transaction(async (tx) => {
    const d = await tx.device.update({ where: { id: existing.id }, data: { ...data, slug, quantity: v.quantity } });
    if (delta !== 0) {
      await tx.inventoryTransaction.create({
        data: { deviceId: d.id, type: "ADJUSTMENT", delta, quantityAfter: v.quantity, reason: v.quantityReason || null, userId: user.id },
      });
    }
    return d;
  });

  const changes = diff(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
  if (changes.changed) {
    await audit({ userId: user.id, action: "device.update", entity: "device", entityId: existing.id, before: changes.before as Prisma.InputJsonValue, after: changes.after as Prisma.InputJsonValue });
  }
  revalidateTag(CATALOG_TAG);
  return { ok: true, message: "saved", at: Date.now() };
}

/** Publish / unpublish / archive / restore. Publishing requires both names and a category. */
export async function setDeviceStatusAction(id: string, status: DeviceStatus): Promise<FormState> {
  const user = await requireUser();
  const d = await db.device.findFirst({ where: { id } });
  if (!d) return { ok: false, message: "notFound" };
  if (status === "PUBLISHED" && (!d.nameAr.trim() || !d.nameEn.trim() || !d.categoryId)) return { ok: false, message: "publishNeeds" };
  await db.device.update({ where: { id }, data: { status, deletedAt: null } });
  await audit({ userId: user.id, action: `device.status`, entity: "device", entityId: id, before: { status: d.status }, after: { status } });
  revalidateTag(CATALOG_TAG);
  return { ok: true, message: "saved", at: Date.now() };
}

/** Replace the device photo with one of the workbook photos. */
export async function applyWorkbookPhotoAction(id: string, photoNo: number): Promise<FormState> {
  const user = await requireUser();
  const photo = inventory.photos[String(photoNo) as keyof typeof inventory.photos];
  if (!photo) return { ok: false, message: "notFound" };
  const before = await db.deviceImage.findFirst({ where: { deviceId: id }, orderBy: { sortOrder: "asc" } });
  await db.$transaction([
    db.deviceImage.deleteMany({ where: { deviceId: id } }),
    db.deviceImage.create({ data: { deviceId: id, url: photo.src, width: photo.width, height: photo.height, sourcePhoto: photoNo } }),
  ]);
  await audit({ userId: user.id, action: "device.photo", entity: "device", entityId: id, before: { url: before?.url ?? null }, after: { url: photo.src, sourcePhoto: photoNo } });
  revalidateTag(CATALOG_TAG);
  return { ok: true, message: "saved", at: Date.now() };
}

export async function uploadPhotoAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = form.get("id") as string;
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, message: "uploadEmpty" };
  const device = await db.device.findFirst({ where: { id }, select: { id: true } });
  if (!device) return { ok: false, message: "notFound" };
  try {
    const img = await saveImage(file);
    const before = await db.deviceImage.findFirst({ where: { deviceId: id } });
    await db.$transaction([
      db.deviceImage.deleteMany({ where: { deviceId: id } }),
      db.deviceImage.create({ data: { deviceId: id, ...img } }),
    ]);
    await audit({ userId: user.id, action: "device.photo", entity: "device", entityId: id, before: { url: before?.url ?? null }, after: { url: img.url } });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: { TOO_LARGE: "uploadTooLarge", BAD_TYPE: "uploadBadType", EMPTY: "uploadEmpty" }[e.code] };
    throw e;
  }
  revalidateTag(CATALOG_TAG);
  return { ok: true, message: "saved", at: Date.now() };
}

export async function removePhotoAction(id: string): Promise<FormState> {
  const user = await requireUser();
  const before = await db.deviceImage.findFirst({ where: { deviceId: id } });
  await db.deviceImage.deleteMany({ where: { deviceId: id } });
  await audit({ userId: user.id, action: "device.photo", entity: "device", entityId: id, before: { url: before?.url ?? null }, after: { url: null } });
  revalidateTag(CATALOG_TAG);
  return { ok: true, message: "saved", at: Date.now() };
}
