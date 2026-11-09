/**
 * Seed / re-import. Safe to run many times:
 *  - categories are upserted by key (names refreshed),
 *  - devices are created only if their sourceKey does not exist yet — admin edits are never overwritten,
 *  - the first ADMIN is created only when no admin exists and ADMIN_EMAIL / ADMIN_PASSWORD are set.
 *
 * Run: npm run db:seed
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import curated from "../src/data/equipment.json";
import inventory from "../src/data/inventory-rows.json";
import { slugify } from "../src/lib/slug";

const db = new PrismaClient();

const CATEGORIES = [
  { key: "electronics", nameEn: "Electronics", nameAr: "الإلكترونيات" },
  { key: "electrical", nameEn: "Electrical Engineering", nameAr: "الهندسة الكهربائية" },
  { key: "telecom", nameEn: "Telecommunications", nameAr: "الاتصالات" },
  { key: "microscopy", nameEn: "Microscopy & Inspection", nameAr: "المجاهر والفحص" },
  { key: "soldering", nameEn: "Soldering & Repair", nameAr: "اللحام والإصلاح" },
  { key: "automation", nameEn: "Automation", nameAr: "الأتمتة" },
  { key: "laboratory", nameEn: "Laboratory Equipment", nameAr: "معدات المختبرات" },
];

const keyFor = (items: number[]) => `inventory-v1:${items.join("+")}`;

async function uniqueSlug(base: string) {
  let slug = base;
  for (let i = 2; await db.device.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
}

async function main() {
  // categories
  const cat: Record<string, string> = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await db.category.upsert({
      where: { key: c.key },
      update: { nameEn: c.nameEn, nameAr: c.nameAr },
      create: { ...c, sortOrder: i },
    });
    cat[c.key] = row.id;
  }

  const rows = new Map(inventory.rows.map((r) => [r.itemNo, r]));
  let created = 0;
  let skipped = 0;

  // 1) curated, verified devices → PUBLISHED
  for (const [i, d] of curated.devices.entries()) {
    const sourceKey = keyFor(d.itemNos);
    if (await db.device.findUnique({ where: { sourceKey } })) { skipped++; continue; }
    await db.device.create({
      data: {
        slug: await uniqueSlug(d.slug),
        status: "PUBLISHED",
        categoryId: cat[d.category],
        archetype: d.archetype,
        brand: d.brand,
        model: d.model,
        nameEn: d.nameEn,
        nameAr: d.nameAr,
        descEn: d.descEn,
        descAr: d.descAr,
        usesEn: d.usesEn,
        usesAr: d.usesAr,
        benefitsEn: d.benefitsEn,
        benefitsAr: d.benefitsAr,
        condition: "UNVERIFIED",
        quantity: d.quantity,
        marketPriceOMR: new Prisma.Decimal(d.indicativeNewUnitPriceOMR),
        sourceItemNos: d.itemNos,
        sourceKey,
        sourceDescription: d.itemNos.map((n) => rows.get(n)?.description).join(" + "),
        sortOrder: i,
        images: { create: [{ url: d.photo.src, width: d.photo.width, height: d.photo.height, sourcePhoto: d.photo.sourcePhoto }] },
        inventory: { create: [{ type: "IMPORT", delta: d.quantity, quantityAfter: d.quantity, reason: `Workbook items ${d.itemNos.join(", ")}` }] },
      },
    });
    created++;
  }

  // 2) remaining workbook rows (photo not confirmed) → REVIEW queue, never public until approved
  const curatedItems = new Set(curated.devices.flatMap((d) => d.itemNos));
  for (const r of inventory.rows) {
    if (curatedItems.has(r.itemNo)) continue;
    const sourceKey = keyFor([r.itemNo]);
    if (await db.device.findUnique({ where: { sourceKey } })) { skipped++; continue; }
    const photo = r.suggestedPhoto ? inventory.photos[String(r.suggestedPhoto) as keyof typeof inventory.photos] : undefined;
    await db.device.create({
      data: {
        slug: await uniqueSlug(slugify(r.description)),
        status: "REVIEW",
        nameEn: r.description,
        condition: "UNVERIFIED",
        quantity: r.quantity,
        marketPriceOMR: new Prisma.Decimal(r.unitPrice),
        sourceItemNos: [r.itemNo],
        sourceKey,
        sourceDescription: r.description,
        sortOrder: 1000 + r.itemNo,
        images: photo ? { create: [{ url: photo.src, width: photo.width, height: photo.height, sourcePhoto: r.suggestedPhoto }] } : undefined,
        inventory: { create: [{ type: "IMPORT", delta: r.quantity, quantityAfter: r.quantity, reason: `Workbook item ${r.itemNo}` }] },
      },
    });
    created++;
  }

  // 3) first administrator
  const admins = await db.user.count({ where: { role: "ADMIN" } });
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (admins === 0) {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
      console.warn("No admin created: set ADMIN_EMAIL and ADMIN_PASSWORD (12+ chars) in .env and run the seed again.");
    } else {
      await db.user.create({
        data: { email: ADMIN_EMAIL.toLowerCase(), name: ADMIN_NAME || "المسؤول", role: "ADMIN", passwordHash: await hash(ADMIN_PASSWORD) },
      });
      console.log(`Admin created: ${ADMIN_EMAIL}`);
    }
  }

  const [published, review, units] = await Promise.all([
    db.device.count({ where: { status: "PUBLISHED" } }),
    db.device.count({ where: { status: "REVIEW" } }),
    db.device.aggregate({ _sum: { quantity: true } }),
  ]);
  console.log(`Devices created: ${created}, already present: ${skipped}. Published: ${published}, review queue: ${review}, total units: ${units._sum.quantity}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
