"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma, RequestStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientInfo } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth/guard";

export type RequestFormState = { ok: boolean; message?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  type: z.enum(["DONATION", "PURCHASE"]),
  name: z.string().trim().min(2, "required").max(120),
  organization: z.string().trim().min(2, "required").max(160),
  email: z.string().trim().toLowerCase().email("invalidEmail").max(160),
  phone: z.string().trim().regex(/^\+?[\d\s-]{7,20}$/, "invalidPhone"),
  city: z.string().trim().max(80).default(""),
  message: z.string().trim().max(2000).default(""),
  items: z
    .array(z.object({ slug: z.string().max(120), quantity: z.coerce.number().int().min(1).max(10_000) }))
    .min(1, "noItems")
    .max(30),
});

/** Public: store a donation / purchase request. Rate-limited; only published devices can be requested. */
export async function submitRequestAction(_prev: RequestFormState, form: FormData): Promise<RequestFormState> {
  const slugs = form.getAll("itemSlug").map(String);
  const qtys = form.getAll("itemQty").map(String);
  const parsed = schema.safeParse({
    type: form.get("type"),
    name: form.get("name"),
    organization: form.get("organization"),
    email: form.get("email"),
    phone: form.get("phone"),
    city: form.get("city") ?? "",
    message: form.get("message") ?? "",
    items: slugs.map((slug, i) => ({ slug, quantity: qtys[i] })).filter((x) => x.slug),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0]);
      if (!fieldErrors[k]) fieldErrors[k] = ["required", "invalidEmail", "invalidPhone", "noItems"].includes(i.message) ? i.message : "required";
    }
    return { ok: false, message: "errors", fieldErrors };
  }
  const { ip } = await clientInfo();
  const limited = await rateLimit(`request:${ip}`, 5, 60 * 60_000);
  if (!limited.ok) return { ok: false, message: "tooMany" };

  const v = parsed.data;
  const devices = await db.device.findMany({ where: { slug: { in: v.items.map((i) => i.slug) }, status: "PUBLISHED", deletedAt: null }, select: { slug: true, nameEn: true, nameAr: true } });
  const items = v.items
    .map((i) => {
      const d = devices.find((x) => x.slug === i.slug);
      return d ? { slug: d.slug, nameEn: d.nameEn, nameAr: d.nameAr, quantity: i.quantity } : null;
    })
    .filter((x) => x !== null);
  if (items.length === 0) return { ok: false, message: "errors", fieldErrors: { items: "noItems" } };

  await db.assetRequest.create({
    data: { type: v.type, name: v.name, organization: v.organization, email: v.email, phone: v.phone, city: v.city, message: v.message, items: items as unknown as Prisma.InputJsonValue, ip },
  });
  revalidatePath("/[locale]/admin/(panel)/requests", "page");
  return { ok: true };
}

/** Staff: change status / note. */
export async function updateRequestAction(id: string, status: RequestStatus, adminNote: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const before = await db.assetRequest.findUnique({ where: { id }, select: { status: true } });
  if (!before) return { ok: false };
  await db.assetRequest.update({ where: { id }, data: { status, adminNote: adminNote.slice(0, 2000) } });
  await audit({ userId: user.id, action: "request.update", entity: "request", entityId: id, before: { status: before.status }, after: { status } });
  revalidatePath("/[locale]/admin/(panel)/requests", "page");
  return { ok: true };
}
