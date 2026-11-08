import "server-only";
/**
 * Public catalogue data access (PostgreSQL via Prisma).
 * Results are cached under the "catalog" tag; admin mutations call revalidateTag("catalog").
 * Only PUBLISHED, non-deleted devices are ever returned here.
 */
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { archetypes } from "@/components/viewer3d/archetypes";
import inventory from "@/data/inventory-rows.json";
import type { CategoryKey, Condition, Device, LocalizedDevice } from "./types";

export const CATALOG_TAG = "catalog";
export const categoryKeys: CategoryKey[] = ["electronics", "electrical", "telecom", "microscopy", "soldering", "automation", "laboratory"];
export const pricingNotes: string[] = inventory.pricingNotes;

/** Extra search words per device type (singular forms and everyday names). */
const SYNONYMS: Record<string, string> = {
  microscope: "مجهر ميكروسكوب microscope",
  oscilloscope: "اوسيلوسكوب أوسيلوسكوب راسم اشارة scope",
  "power-supply": "باور سبلاي مصدر طاقة مزود power supply psu",
  multimeter: "ملتيميتر افوميتر مقياس متعدد meter",
  telephone: "هاتف تلفون تليفون phone",
  "soldering-station": "لحام كاوية soldering iron",
  "soldering-gun": "لحام مسدس كاوية soldering",
  fan: "مروحة مراوح fan",
  "bench-instrument": "جهاز قياس اختبار instrument tester",
  "training-board": "تدريب لوحة كت kit trainer",
  "network-unit": "شبكة اتصالات network",
  motor: "محرك موتور motor",
  variac: "فارياك محول variac transformer",
  lightbox: "صندوق اضاءة light box",
  "air-purifier": "منقي هواء فلتر purifier",
  "kit-case": "صندوق قطع ملحقات kit",
};

const include = {
  category: { select: { key: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
} satisfies Prisma.DeviceInclude;

type Row = Prisma.DeviceGetPayload<{ include: typeof include }>;

function toDevice(r: Row): Device {
  const img = r.images[0];
  return {
    slug: r.slug,
    itemNos: r.sourceItemNos,
    category: (r.category?.key as CategoryKey) ?? null,
    archetype: r.archetype && archetypes[r.archetype] ? r.archetype : null,
    brand: r.brand,
    model: r.model,
    nameEn: r.nameEn,
    nameAr: r.nameAr || r.nameEn,
    descEn: r.descEn,
    descAr: r.descAr,
    usesEn: r.usesEn,
    usesAr: r.usesAr,
    benefitsEn: r.benefitsEn,
    benefitsAr: r.benefitsAr,
    quantity: r.quantity,
    condition: r.condition.toLowerCase() as Condition,
    indicativeNewUnitPriceOMR: r.marketPriceOMR == null ? null : Number(r.marketPriceOMR),
    photo: img ? { src: img.url, width: img.width, height: img.height } : null,
  };
}

const publishedWhere = { status: "PUBLISHED", deletedAt: null } satisfies Prisma.DeviceWhereInput;

const loadPublished = unstable_cache(
  async (): Promise<Device[]> => {
    const rows = await db.device.findMany({ where: publishedWhere, include, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    return rows.map(toDevice);
  },
  ["catalog-published"],
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

export function localize(d: Device, locale: string): LocalizedDevice {
  const ar = locale === "ar";
  const type = d.archetype ? archetypes[d.archetype] : undefined;
  return {
    ...d,
    name: ar ? d.nameAr : d.nameEn,
    altName: ar ? d.nameEn : d.nameAr,
    desc: ar ? d.descAr : d.descEn,
    uses: ar ? d.usesAr : d.usesEn,
    benefits: ar ? d.benefitsAr : d.benefitsEn,
    searchText: [type?.en, type?.ar, d.archetype ? SYNONYMS[d.archetype] : ""].join(" "),
  };
}

export async function getDevices(locale: string): Promise<LocalizedDevice[]> {
  return (await loadPublished()).map((d) => localize(d, locale));
}

export async function getDevice(slug: string, locale: string): Promise<LocalizedDevice | undefined> {
  const d = (await loadPublished()).find((x) => x.slug === slug);
  return d && localize(d, locale);
}

export async function getStats() {
  const devices = await loadPublished();
  return {
    devices: devices.length,
    units: devices.reduce((s, d) => s + d.quantity, 0),
    byCategory: Object.fromEntries(categoryKeys.map((k) => [k, devices.filter((d) => d.category === k).length])) as Record<CategoryKey, number>,
  };
}

export { formatOMR } from "./format";
