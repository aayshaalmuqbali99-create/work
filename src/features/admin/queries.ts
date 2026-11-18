import "server-only";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import type { DeviceStatus, Prisma } from "@prisma/client";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

/** For admin pages: redirect to the login page when not signed in. */
export const requirePageUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/admin/login", locale: await getLocale() });
  return user!;
});

export const STATUSES: DeviceStatus[] = ["PUBLISHED", "REVIEW", "DRAFT", "ARCHIVED"];

export async function listDevices({ status, q }: { status?: DeviceStatus; q?: string }) {
  await requirePageUser();
  const where: Prisma.DeviceWhereInput = { deletedAt: null, ...(status ? { status } : {}) };
  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { nameEn: { contains: term, mode: "insensitive" } },
      { nameAr: { contains: term, mode: "insensitive" } },
      { brand: { contains: term, mode: "insensitive" } },
      { model: { contains: term, mode: "insensitive" } },
      { sourceDescription: { contains: term, mode: "insensitive" } },
      ...(/^\d+$/.test(term) ? [{ sourceItemNos: { has: Number(term) } }] : []),
    ];
  }
  const [devices, counts] = await Promise.all([
    db.device.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, category: { select: { key: true } } },
    }),
    db.device.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
  ]);
  return { devices, counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) as Partial<Record<DeviceStatus, number>> };
}

export async function getDeviceForEdit(id: string) {
  await requirePageUser();
  return db.device.findFirst({
    where: { id, deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: { select: { key: true } },
      inventory: { orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
    },
  });
}

export async function getCategories() {
  return db.category.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getDashboard() {
  await requirePageUser();
  const [byStatus, publishedUnits, allUnits, unverified, recent] = await Promise.all([
    db.device.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
    db.device.aggregate({ where: { status: "PUBLISHED", deletedAt: null }, _sum: { quantity: true } }),
    db.device.aggregate({ where: { deletedAt: null, status: { not: "ARCHIVED" } }, _sum: { quantity: true } }),
    db.device.count({ where: { status: "PUBLISHED", deletedAt: null, condition: "UNVERIFIED" } }),
    listActivity(8),
  ]);
  const count = (s: DeviceStatus) => byStatus.find((b) => b.status === s)?._count ?? 0;
  return {
    published: count("PUBLISHED"),
    review: count("REVIEW"),
    draft: count("DRAFT"),
    publishedUnits: publishedUnits._sum.quantity ?? 0,
    allUnits: allUnits._sum.quantity ?? 0,
    unverified,
    recent,
  };
}

export async function listActivity(take = 100) {
  await requirePageUser();
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take, include: { user: { select: { name: true } } } });
  const ids = [...new Set(logs.filter((l) => l.entity === "device" && l.entityId).map((l) => l.entityId!))];
  const devices = await db.device.findMany({ where: { id: { in: ids } }, select: { id: true, nameEn: true, nameAr: true } });
  const names = new Map(devices.map((d) => [d.id, d]));
  return logs.map((l) => ({ ...l, device: l.entityId ? names.get(l.entityId) ?? null : null }));
}
