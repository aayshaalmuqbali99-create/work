/**
 * Omantel Facility Hub — building location system (seed version 2).
 *
 * - Area category library (reusable across floors and buildings).
 * - Confirmed basements B1 / B2 / B3 (names aligned with Facility Operations' list).
 * - PROVISIONAL Ground, Mezzanine and Floors 1–6 with Sun / Moon wing links and suggested areas.
 *   These are proposals until the official building map is confirmed; they are flagged as provisional
 *   in the dashboard. No rooms, room numbers, coordinates or floor plans are invented.
 *
 * Runs once per database (FacSettings.seedVersion), so administrator edits made afterwards are never overwritten.
 */
import type { PrismaClient } from "@prisma/client";

type Db = PrismaClient;

/** key, English, Arabic, icon, default detail fields */
export const AREA_CATEGORIES: [string, string, string, string, string[]][] = [
  ["OFFICE", "Office / Workstation", "مكتب / محطة عمل", "briefcase", ["office", "room", "elevator", "landmark"]],
  ["MEETING_ROOMS", "Meeting Room", "غرفة اجتماعات", "users", ["meetingRoom", "room", "elevator", "landmark"]],
  ["RESTROOMS", "Restroom", "دورة مياه", "bath", ["elevator", "landmark"]],
  ["PANTRY", "Pantry / Kitchen", "مطبخ", "coffee", ["elevator", "landmark"]],
  ["CORRIDOR", "Corridor", "ممر", "footprints", ["room", "elevator", "landmark"]],
  ["ELEVATOR_LOBBY", "Elevator / Lift Lobby", "مصعد / منطقة المصاعد", "arrow-up-down", ["elevator", "landmark"]],
  ["STAIRCASE", "Staircase", "درج / سلالم", "stairs", ["landmark"]],
  ["ENTRANCE", "Building Entrance", "مدخل المبنى", "door-open", ["entrance", "landmark"]],
  ["RECEPTION", "Reception", "الاستقبال", "concierge", ["entrance", "landmark"]],
  ["WAITING_AREA", "Waiting Area", "منطقة انتظار", "armchair", ["entrance", "landmark"]],
  ["PARKING", "Parking Area", "مواقف السيارات", "parking", ["parkingSpace", "column", "elevator", "entrance", "landmark"]],
  ["PARKING_GATE", "Parking Gate / Barrier", "بوابة / حاجز المواقف", "barrier", ["entrance", "column", "landmark"]],
  ["EVENT_AREA", "Event Area", "منطقة الفعاليات", "calendar", ["entrance", "landmark"]],
  ["CLINIC", "Clinic", "العيادة", "heart-pulse", ["room", "landmark"]],
  ["PHARMACY", "Pharmacy", "الصيدلية", "pill", ["landmark"]],
  ["COMMON_AREA", "Common Area", "مساحة مشتركة", "sofa", ["elevator", "landmark"]],
  ["UTILITY_ROOM", "Service / Utility Room", "غرفة خدمات", "wrench", ["room", "landmark"]],
  ["OTHER", "Other", "أخرى", "map-pin", ["landmark"]],
];
const fieldsOf = (key: string) => AREA_CATEGORIES.find((c) => c[0] === key)?.[4] ?? ["landmark"];

/** Creates missing categories; completes the placeholder rows created by the migration (name = key). */
export async function seedAreaCategories(db: Db) {
  for (const [i, [key, nameEn, nameAr, icon, defaultFields]] of AREA_CATEGORIES.entries()) {
    const existing = await db.facAreaCategory.findUnique({ where: { key } });
    if (!existing) await db.facAreaCategory.create({ data: { key, nameEn, nameAr, icon, defaultFields, sortOrder: i } });
    else if (existing.nameEn === key && existing.nameAr === key) {
      await db.facAreaCategory.update({ where: { key }, data: { nameEn, nameAr, icon, defaultFields, sortOrder: i } });
    }
  }
}

/** Confirmed basement areas (names as supplied by Facility Operations). */
export const BASEMENT_AREAS: Record<string, { kind: string; nameEn: string; nameAr: string; isOther?: boolean; scope?: boolean; descEn?: string; descAr?: string }[]> = {
  B1: [
    { kind: "PARKING", nameEn: "Parking Area", nameAr: "مواقف السيارات" },
    { kind: "MEETING_ROOMS", nameEn: "Meeting Rooms", nameAr: "غرف الاجتماعات" },
    { kind: "RESTROOMS", nameEn: "Restrooms", nameAr: "دورات المياه" },
    { kind: "PHARMACY", nameEn: "Pharmacy", nameAr: "الصيدلية", scope: true },
    { kind: "CLINIC", nameEn: "Clinic", nameAr: "العيادة", scope: true },
    { kind: "EVENT_AREA", nameEn: "Central Event Area", nameAr: "منطقة الفعاليات في المنتصف", descEn: "Located in the middle of B1.", descAr: "تقع في منتصف الطابق B1." },
    { kind: "OTHER", nameEn: "Other", nameAr: "أخرى", isOther: true },
  ],
  B2: [
    { kind: "PARKING", nameEn: "Parking Area", nameAr: "مواقف السيارات" },
    { kind: "OTHER", nameEn: "Other", nameAr: "أخرى", isOther: true },
  ],
  B3: [
    { kind: "PARKING", nameEn: "Parking Area", nameAr: "مواقف السيارات" },
    { kind: "OTHER", nameEn: "Other", nameAr: "أخرى", isOther: true },
  ],
};
export const basementFields = (kind: string) => fieldsOf(kind);

/** Names used by the first seed (version 1) — renamed only if still unchanged. */
const V1_NAMES: Record<string, { ar: string; fields: string[] }> = {
  PARKING: { ar: "منطقة المواقف", fields: ["parkingSpace", "column", "elevator", "landmark"] },
  MEETING_ROOMS: { ar: "قاعات الاجتماعات", fields: ["meetingRoom", "landmark"] },
  EVENT_AREA: { ar: "منطقة الفعاليات المركزية", fields: ["landmark"] },
};

const UPPER_AREAS = (kinds: string[]) =>
  kinds.map((k) => {
    const c = AREA_CATEGORIES.find((x) => x[0] === k)!;
    const plural: Record<string, [string, string]> = {
      OFFICE: ["Offices", "المكاتب"], MEETING_ROOMS: ["Meeting Rooms", "غرف الاجتماعات"], RESTROOMS: ["Restrooms", "دورات المياه"],
      PANTRY: ["Pantry / Kitchen", "المطابخ"], CORRIDOR: ["Corridors", "الممرات"], ELEVATOR_LOBBY: ["Elevators / Lift Lobby", "المصاعد ومنطقة المصاعد"],
      STAIRCASE: ["Staircases", "السلالم"], RECEPTION: ["Reception", "الاستقبال"], WAITING_AREA: ["Waiting Areas", "مناطق الانتظار"], OTHER: ["Other", "أخرى"],
    };
    const [en, ar] = plural[k] ?? [c[1], c[2]];
    return { kind: k, nameEn: en, nameAr: ar, isOther: k === "OTHER" };
  });

const STANDARD = ["OFFICE", "MEETING_ROOMS", "RESTROOMS", "PANTRY", "CORRIDOR", "ELEVATOR_LOBBY", "STAIRCASE", "OTHER"];
/** PROVISIONAL floors (to be confirmed against the official building map). */
export const UPPER_FLOORS: { code: string; nameEn: string; nameAr: string; level: number; areas: ReturnType<typeof UPPER_AREAS> }[] = [
  { code: "G", nameEn: "Ground Floor", nameAr: "الطابق الأرضي", level: 0, areas: UPPER_AREAS(["RECEPTION", "OFFICE", "MEETING_ROOMS", "RESTROOMS", "CORRIDOR", "ELEVATOR_LOBBY", "STAIRCASE", "WAITING_AREA", "OTHER"]) },
  { code: "M", nameEn: "Mezzanine", nameAr: "الميزانين", level: 1, areas: UPPER_AREAS(STANDARD) },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({
    code: String(n),
    nameEn: `Floor ${n}`,
    nameAr: ["الطابق الأول", "الطابق الثاني", "الطابق الثالث", "الطابق الرابع", "الطابق الخامس", "الطابق السادس"][n - 1],
    level: n + 1,
    areas: UPPER_AREAS(STANDARD),
  })),
];

/** Problems that should also be offered in the new area types (added once, additively). */
const ISSUE_KIND_ADDITIONS: [string, string, string[]][] = [
  ["hvac", "Air conditioning", ["RECEPTION", "WAITING_AREA", "PANTRY", "COMMON_AREA", "ELEVATOR_LOBBY", "CORRIDOR", "UTILITY_ROOM"]],
  ["electrical", "Lighting failure", ["PANTRY", "ELEVATOR_LOBBY", "STAIRCASE", "ENTRANCE", "RECEPTION", "WAITING_AREA", "COMMON_AREA", "UTILITY_ROOM", "PARKING_GATE"]],
  ["plumbing", "Water leakage", ["PANTRY", "CORRIDOR", "UTILITY_ROOM", "OFFICE", "MEETING_ROOMS", "COMMON_AREA"]],
  ["doors", "Doors and locks", ["PANTRY", "CORRIDOR", "STAIRCASE", "ENTRANCE", "RECEPTION", "UTILITY_ROOM"]],
  ["civil", "Ceiling or flooring damage", ["STAIRCASE", "ENTRANCE", "RECEPTION", "WAITING_AREA", "PANTRY", "COMMON_AREA", "ELEVATOR_LOBBY", "RESTROOMS"]],
  ["furniture", "Furniture", ["RECEPTION", "WAITING_AREA", "COMMON_AREA", "PANTRY"]],
  ["parking", "Parking gate or barrier malfunction", ["PARKING_GATE"]],
  ["signage", "Damaged directional signs", ["PARKING_GATE", "CORRIDOR", "ELEVATOR_LOBBY", "STAIRCASE", "ENTRANCE"]],
  ["c-waste", "Waste removal", ["CORRIDOR", "RECEPTION", "WAITING_AREA", "COMMON_AREA", "ENTRANCE"]],
  ["c-spill", "Spill cleaning", ["RECEPTION", "WAITING_AREA", "COMMON_AREA", "ELEVATOR_LOBBY", "ENTRANCE", "STAIRCASE", "MEETING_ROOMS", "RESTROOMS"]],
  ["c-odor", "Odors", ["PANTRY", "CORRIDOR", "COMMON_AREA", "ELEVATOR_LOBBY"]],
  ["c-pest", "Pest complaints", ["RESTROOMS", "COMMON_AREA", "UTILITY_ROOM"]],
];
/** New problems for area types that had none. */
const NEW_ISSUES: [string, string, string, string[]][] = [
  ["c-other", "General area cleaning", "تنظيف عام للمنطقة", ["RECEPTION", "WAITING_AREA", "COMMON_AREA", "ENTRANCE", "STAIRCASE"]],
  ["c-corridors", "Staircase cleaning", "تنظيف السلالم", ["STAIRCASE"]],
  ["elevators", "Elevator doors or buttons not working", "أبواب أو أزرار المصعد لا تعمل", ["ELEVATOR_LOBBY"]],
];

export async function upgradeLocationsV2(db: Db) {
  const settings = await db.facSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  if (settings.seedVersion >= 2) return false;
  const building = await db.facBuilding.findUniqueOrThrow({ where: { code: "HQ" } });
  const wings = await db.facWing.findMany({ where: { buildingId: building.id, code: { in: ["SUN", "MOON"] } }, orderBy: { sortOrder: "asc" } });

  // 1) Confirmed basements: align names/fields with the confirmed list when still at the first seed's defaults.
  for (const code of ["B1", "B2", "B3"]) {
    const floor = await db.facFloor.findUnique({ where: { buildingId_code: { buildingId: building.id, code } }, include: { areas: true } });
    if (!floor) continue;
    await db.facFloor.update({ where: { id: floor.id }, data: { verification: "CONFIRMED" } });
    for (const a of floor.areas) {
      const target = BASEMENT_AREAS[code].find((x) => x.kind === a.kind);
      const v1 = V1_NAMES[a.kind];
      const data: Record<string, unknown> = { verification: "CONFIRMED" };
      if (target && v1 && a.nameAr === v1.ar) data.nameAr = target.nameAr;
      if (v1 && JSON.stringify(a.fields) === JSON.stringify(v1.fields)) data.fields = fieldsOf(a.kind);
      if (a.kind === "RESTROOMS" && JSON.stringify(a.fields) === JSON.stringify(["landmark"])) data.fields = fieldsOf("RESTROOMS");
      await db.facArea.update({ where: { id: a.id }, data });
    }
  }

  // 2) Provisional ground, mezzanine and upper floors with Sun / Moon wing links.
  for (const [fi, f] of UPPER_FLOORS.entries()) {
    const existing = await db.facFloor.findUnique({ where: { buildingId_code: { buildingId: building.id, code: f.code } } });
    if (existing) continue;
    const floor = await db.facFloor.create({
      data: { buildingId: building.id, code: f.code, nameEn: f.nameEn, nameAr: f.nameAr, level: f.level, sortOrder: 20 + fi, verification: "PROVISIONAL" },
    });
    for (const [wi, w] of wings.entries()) {
      await db.facFloorWing.create({ data: { floorId: floor.id, wingId: w.id, verification: "PROVISIONAL", sortOrder: wi } });
    }
    for (const [ai, a] of f.areas.entries()) {
      // Shared by both wings (wingId null) until the map shows where each area is.
      await db.facArea.create({
        data: { floorId: floor.id, kind: a.kind, nameEn: a.nameEn, nameAr: a.nameAr, isOther: a.isOther, fields: fieldsOf(a.kind), sortOrder: ai, verification: "PROVISIONAL" },
      });
    }
  }

  // 3) Problems available in the new area types.
  for (const [catKey, nameEn, kinds] of ISSUE_KIND_ADDITIONS) {
    const issue = await db.facIssue.findFirst({ where: { nameEn, category: { key: catKey } } });
    if (issue && issue.areaKinds.length > 0) {
      await db.facIssue.update({ where: { id: issue.id }, data: { areaKinds: [...new Set([...issue.areaKinds, ...kinds])] } });
    }
  }
  for (const [catKey, nameEn, nameAr, kinds] of NEW_ISSUES) {
    const cat = await db.facCategory.findUnique({ where: { key: catKey } });
    if (!cat || (await db.facIssue.findFirst({ where: { categoryId: cat.id, nameEn } }))) continue;
    await db.facIssue.create({ data: { categoryId: cat.id, nameEn, nameAr, areaKinds: kinds, sortOrder: 50 } });
  }

  await db.facSettings.update({ where: { id: 1 }, data: { seedVersion: 2 } });
  return true;
}
