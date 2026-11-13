/**
 * Omantel Facility Hub — initial configuration and development sample data.
 *
 * Configuration (idempotent, never overwrites edits made in the dashboard):
 *  - The building and its verified basement levels B1, B2, B3 with the areas supplied by Facility Operations.
 *    No room numbers, coordinates or upper floors are invented: those are added later in the dashboard.
 *  - Sun and Moon wings (configurable; no floors are assigned to them until verified).
 *  - Maintenance and cleaning categories with the problems per area type.
 *  - E-mail templates (Arabic + English).
 *
 * Sample data (only when FAC_SAMPLE_DATA is not "false" and NODE_ENV is not production):
 *  - Sample users for each role, sample internal teams, sample routing rules, SAMPLE SLA values and
 *    sample requests. Every sample row is flagged `isSample` and labelled "Sample" in the UI.
 */
import { PrismaClient, type FacPriority, type FacService, type FacStatus } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { addBusinessMinutes, type BusinessCalendar } from "../src/features/facility/domain/sla";
import { formatReference } from "../src/features/facility/domain/reference";
import PREVIOUS_TEMPLATES from "./facility-templates-v1.json";

type Db = PrismaClient;

const PARKING_FIELDS = ["parkingSpace", "column", "elevator", "landmark"];
const CLINICAL_SCOPE_EN = "Facility maintenance and general non-clinical cleaning only. Medical equipment, medication, clinical services and specialised medical cleaning are outside Facility Operations scope unless explicitly approved.";
const CLINICAL_SCOPE_AR = "صيانة المرافق والنظافة العامة غير السريرية فقط. الأجهزة الطبية والأدوية والخدمات السريرية والتنظيف الطبي المتخصص خارج نطاق عمليات المرافق ما لم تتم الموافقة عليها صراحة.";

const FLOORS = [
  {
    code: "B1", nameEn: "Basement 1 (B1)", nameAr: "الطابق السفلي الأول (B1)", level: -1,
    areas: [
      { kind: "PARKING", nameEn: "Parking Area", nameAr: "منطقة المواقف", fields: PARKING_FIELDS },
      { kind: "MEETING_ROOMS", nameEn: "Meeting Rooms", nameAr: "قاعات الاجتماعات", fields: ["meetingRoom", "landmark"] },
      { kind: "RESTROOMS", nameEn: "Restrooms", nameAr: "دورات المياه", fields: ["landmark"] },
      { kind: "PHARMACY", nameEn: "Pharmacy", nameAr: "الصيدلية", fields: ["landmark"], scope: true },
      { kind: "CLINIC", nameEn: "Clinic", nameAr: "العيادة", fields: ["room", "landmark"], scope: true },
      { kind: "EVENT_AREA", nameEn: "Central Event Area", nameAr: "منطقة الفعاليات المركزية", fields: ["landmark"], descEn: "Located in the middle of B1.", descAr: "تقع في منتصف الطابق B1." },
      { kind: "OTHER", nameEn: "Other", nameAr: "أخرى", fields: ["landmark"], isOther: true },
    ],
  },
  {
    code: "B2", nameEn: "Basement 2 (B2)", nameAr: "الطابق السفلي الثاني (B2)", level: -2,
    areas: [
      { kind: "PARKING", nameEn: "Parking Area", nameAr: "منطقة المواقف", fields: PARKING_FIELDS },
      { kind: "OTHER", nameEn: "Other", nameAr: "أخرى", fields: ["landmark"], isOther: true },
    ],
  },
  {
    code: "B3", nameEn: "Basement 3 (B3)", nameAr: "الطابق السفلي الثالث (B3)", level: -3,
    areas: [
      { kind: "PARKING", nameEn: "Parking Area", nameAr: "منطقة المواقف", fields: PARKING_FIELDS },
      { kind: "OTHER", nameEn: "Other", nameAr: "أخرى", fields: ["landmark"], isOther: true },
    ],
  },
] as const;

type IssueSeed = { en: string; ar: string; kinds?: string[]; floors?: string[]; p?: FacPriority; safety?: boolean };
type CategorySeed = { key: string; service: FacService; en: string; ar: string; icon: string; issues: IssueSeed[] };

const B23 = ["B2", "B3"];
const M = "MAINTENANCE" as const;
const C = "CLEANING" as const;

const CATEGORIES: CategorySeed[] = [
  { key: "hvac", service: M, en: "HVAC / Air Conditioning", ar: "التكييف والتهوية المركزية", icon: "wind", issues: [
    { en: "Air conditioning", ar: "التكييف", kinds: ["MEETING_ROOMS", "PHARMACY", "CLINIC", "EVENT_AREA", "OFFICE"] },
    { en: "Too hot or too cold", ar: "حرارة أو برودة زائدة", kinds: ["OFFICE"] },
  ] },
  { key: "electrical", service: M, en: "Electrical and Lighting", ar: "الكهرباء والإنارة", icon: "lightbulb", issues: [
    { en: "Lighting failure", ar: "عطل في الإنارة", kinds: ["PARKING", "MEETING_ROOMS", "RESTROOMS", "PHARMACY", "CLINIC", "EVENT_AREA", "OFFICE", "CORRIDOR"] },
    { en: "Electrical building fixtures", ar: "التجهيزات الكهربائية للمبنى", kinds: ["EVENT_AREA"] },
    { en: "Building electrical issues", ar: "مشكلات كهربائية في المبنى", kinds: ["PARKING"], floors: B23 },
    { en: "Exposed wiring or electrical hazard", ar: "أسلاك مكشوفة أو خطر كهربائي", p: "HIGH", safety: true },
  ] },
  { key: "plumbing", service: M, en: "Plumbing and Drainage", ar: "السباكة والتصريف", icon: "droplets", issues: [
    { en: "Water leakage", ar: "تسرب مياه", kinds: ["PARKING", "RESTROOMS", "PHARMACY"], p: "HIGH" },
    { en: "Drainage problems", ar: "مشكلات التصريف", kinds: ["PARKING"], floors: B23 },
    { en: "Blocked drains", ar: "انسداد المصارف", kinds: ["RESTROOMS"] },
    { en: "Broken taps", ar: "صنابير معطلة", kinds: ["RESTROOMS", "PANTRY"] },
    { en: "Faulty flushing system", ar: "عطل في نظام الطرد", kinds: ["RESTROOMS"] },
    { en: "Plumbing", ar: "السباكة", kinds: ["CLINIC"] },
  ] },
  { key: "doors", service: M, en: "Doors and Locks", ar: "الأبواب والأقفال", icon: "door-open", issues: [
    { en: "Doors and locks", ar: "الأبواب والأقفال", kinds: ["MEETING_ROOMS", "RESTROOMS", "PHARMACY", "CLINIC", "OFFICE"] },
    { en: "Doors and access", ar: "الأبواب والدخول", kinds: ["EVENT_AREA"] },
    { en: "Damaged doors", ar: "أبواب متضررة", kinds: ["PARKING"], floors: B23 },
  ] },
  { key: "civil", service: M, en: "Civil Maintenance", ar: "الصيانة المدنية", icon: "hammer", issues: [
    { en: "Ceiling or flooring damage", ar: "تلف في السقف أو الأرضية", kinds: ["MEETING_ROOMS", "OFFICE", "CORRIDOR"] },
    { en: "Damaged flooring", ar: "تلف في الأرضية", kinds: ["PARKING"] },
    { en: "Flooring", ar: "الأرضيات", kinds: ["EVENT_AREA"] },
    { en: "General facility maintenance", ar: "صيانة عامة للمرفق", kinds: ["PHARMACY", "CLINIC"] },
  ] },
  { key: "furniture", service: M, en: "Furniture", ar: "الأثاث", icon: "armchair", issues: [
    { en: "Furniture", ar: "الأثاث", kinds: ["MEETING_ROOMS", "EVENT_AREA", "OFFICE"] },
  ] },
  { key: "elevators", service: M, en: "Elevators", ar: "المصاعد", icon: "arrow-up-down", issues: [
    { en: "Elevator not working", ar: "المصعد لا يعمل", kinds: ["ELEVATOR_LOBBY"], p: "HIGH" },
    { en: "Person trapped in elevator", ar: "شخص عالق في المصعد", kinds: ["ELEVATOR_LOBBY"], p: "EMERGENCY", safety: true },
  ] },
  { key: "parking", service: M, en: "Parking Facilities", ar: "مرافق المواقف", icon: "car", issues: [
    { en: "Parking gate or barrier malfunction", ar: "عطل في بوابة أو حاجز المواقف", kinds: ["PARKING"] },
  ] },
  { key: "ventilation", service: M, en: "Ventilation", ar: "التهوية", icon: "fan", issues: [
    { en: "Ventilation problems", ar: "مشكلات التهوية", kinds: ["PARKING"] },
  ] },
  { key: "signage", service: M, en: "Building Signage", ar: "لوحات المبنى الإرشادية", icon: "signpost", issues: [
    { en: "Damaged directional signs", ar: "لوحات إرشادية متضررة", kinds: ["PARKING"] },
  ] },
  { key: "other-maintenance", service: M, en: "Other Facility Maintenance", ar: "صيانة مرافق أخرى", icon: "wrench", issues: [] },

  { key: "c-offices", service: C, en: "Offices", ar: "المكاتب", icon: "briefcase", issues: [
    { en: "Office cleaning", ar: "تنظيف المكاتب", kinds: ["OFFICE"] },
  ] },
  { key: "c-meeting-rooms", service: C, en: "Meeting Rooms", ar: "قاعات الاجتماعات", icon: "presentation", issues: [
    { en: "General cleaning", ar: "تنظيف عام", kinds: ["MEETING_ROOMS"] },
    { en: "Before-meeting cleaning", ar: "تنظيف قبل الاجتماع", kinds: ["MEETING_ROOMS"] },
    { en: "After-meeting cleaning", ar: "تنظيف بعد الاجتماع", kinds: ["MEETING_ROOMS"] },
  ] },
  { key: "c-restrooms", service: C, en: "Restrooms", ar: "دورات المياه", icon: "bath", issues: [
    { en: "General cleaning", ar: "تنظيف عام", kinds: ["RESTROOMS"] },
    { en: "Soap refill", ar: "إعادة تعبئة الصابون", kinds: ["RESTROOMS"], p: "LOW" },
    { en: "Tissue refill", ar: "إعادة تعبئة المناديل", kinds: ["RESTROOMS"], p: "LOW" },
    { en: "Wet floors", ar: "أرضيات مبللة", kinds: ["RESTROOMS"] },
  ] },
  { key: "c-pantries", service: C, en: "Pantries", ar: "المطابخ الصغيرة", icon: "coffee", issues: [
    { en: "Pantry cleaning", ar: "تنظيف المطبخ الصغير", kinds: ["PANTRY"] },
  ] },
  { key: "c-corridors", service: C, en: "Corridors", ar: "الممرات", icon: "footprints", issues: [
    { en: "Corridor cleaning", ar: "تنظيف الممرات", kinds: ["CORRIDOR"] },
  ] },
  { key: "c-elevators", service: C, en: "Elevators", ar: "المصاعد", icon: "arrow-up-down", issues: [
    { en: "Elevator cleaning", ar: "تنظيف المصعد", kinds: ["ELEVATOR_LOBBY"] },
  ] },
  { key: "c-parking", service: C, en: "Parking", ar: "المواقف", icon: "car", issues: [
    { en: "Floor cleaning", ar: "تنظيف الأرضية", kinds: ["PARKING"] },
    { en: "Oil stains", ar: "بقع زيت", kinds: ["PARKING"] },
    { en: "Cleaning after maintenance works", ar: "تنظيف بعد أعمال الصيانة", kinds: ["PARKING"], floors: B23 },
  ] },
  { key: "c-event-areas", service: C, en: "Event Areas", ar: "مناطق الفعاليات", icon: "party-popper", issues: [
    { en: "Pre-event cleaning", ar: "تنظيف قبل الفعالية", kinds: ["EVENT_AREA"] },
    { en: "Post-event cleaning", ar: "تنظيف بعد الفعالية", kinds: ["EVENT_AREA"] },
    { en: "Floor cleaning", ar: "تنظيف الأرضية", kinds: ["EVENT_AREA"] },
    { en: "Cleaning support for approved events", ar: "دعم النظافة للفعاليات المعتمدة", kinds: ["EVENT_AREA"] },
  ] },
  { key: "c-waste", service: C, en: "General Waste Removal", ar: "إزالة النفايات العامة", icon: "trash", issues: [
    { en: "Waste removal", ar: "إزالة النفايات", kinds: ["PARKING", "MEETING_ROOMS", "RESTROOMS", "EVENT_AREA", "OFFICE", "PANTRY"] },
  ] },
  { key: "c-spill", service: C, en: "Spill Cleaning", ar: "تنظيف الانسكابات", icon: "droplet", issues: [
    { en: "Water spills", ar: "انسكاب مياه", kinds: ["PARKING"] },
    { en: "Spill cleaning", ar: "تنظيف انسكاب", kinds: ["EVENT_AREA", "OFFICE", "CORRIDOR", "PANTRY"] },
  ] },
  { key: "c-odor", service: C, en: "Odor Complaints", ar: "شكاوى الروائح", icon: "spray-can", issues: [
    { en: "Odors", ar: "روائح كريهة", kinds: ["PARKING", "RESTROOMS"] },
  ] },
  { key: "c-pest", service: C, en: "Pest Control", ar: "مكافحة الآفات", icon: "bug", issues: [
    { en: "Pest complaints", ar: "شكاوى الآفات", kinds: ["PARKING", "PANTRY", "OFFICE"] },
  ] },
  { key: "c-other", service: C, en: "Other Cleaning Requests", ar: "طلبات نظافة أخرى", icon: "sparkles", issues: [
    { en: "General non-clinical facility cleaning (approved scope)", ar: "نظافة عامة غير سريرية للمرفق (ضمن النطاق المعتمد)", kinds: ["PHARMACY", "CLINIC"] },
  ] },
];

const TEMPLATES: { key: string; subjectEn: string; subjectAr: string; bodyEn: string; bodyAr: string }[] = [
  {
    "key": "SUBMITTED",
    "subjectEn": "Thank You for Letting Us Know – {{reference}}",
    "subjectAr": "شكرًا لإبلاغنا – {{reference}}",
    "bodyEn": "Dear {{name}},\n\nThank you for letting us know. Your report has been successfully received by Facility Operations.\n\nReference: {{reference}}\nLocation: {{location}}\nStatus: {{status}}\n\nYour feedback helps us respond faster. We will keep you updated on its progress.\n\nBest regards,\nFacility Operations Team\nOmantel",
    "bodyAr": "عزيزي/عزيزتي {{name}}،\n\nشكرًا لإبلاغنا. تم استلام بلاغك بنجاح من قبل عمليات المرافق.\n\nالرقم المرجعي: {{reference}}\nالموقع: {{location}}\nالحالة: {{status}}\n\nملاحظاتك تساعدنا على الاستجابة بشكل أسرع، وسنُبقيك على اطلاع بمستجدات طلبك.\n\nمع أطيب التحيات،\nفريق عمليات المرافق\nعُمانتل"
  },
  {
    "key": "ASSIGNED",
    "subjectEn": "Your Facility Request Is Being Handled – {{reference}}",
    "subjectAr": "طلبك قيد المعالجة – {{reference}}",
    "bodyEn": "Dear {{name}},\n\nYour request has been assigned to {{team}}, who will take care of it.\n\nReference: {{reference}}\nLocation: {{location}}\nStatus: {{status}}\n\nBest regards,\nFacility Operations Team\nOmantel",
    "bodyAr": "عزيزي/عزيزتي {{name}}،\n\nتم إسناد طلبك إلى {{team}} للعناية به.\n\nالرقم المرجعي: {{reference}}\nالموقع: {{location}}\nالحالة: {{status}}\n\nمع أطيب التحيات،\nفريق عمليات المرافق\nعُمانتل"
  },
  {
    "key": "IN_PROGRESS",
    "subjectEn": "Work Has Started on Your Request – {{reference}}",
    "subjectAr": "بدأ العمل على طلبك – {{reference}}",
    "bodyEn": "Dear {{name}},\n\nGood news: work has started on your request.\n\nReference: {{reference}}\nLocation: {{location}}\nStatus: {{status}}\n\n{{comment}}\n\nBest regards,\nFacility Operations Team\nOmantel",
    "bodyAr": "عزيزي/عزيزتي {{name}}،\n\nيسعدنا إبلاغك بأن العمل على طلبك قد بدأ.\n\nالرقم المرجعي: {{reference}}\nالموقع: {{location}}\nالحالة: {{status}}\n\n{{comment}}\n\nمع أطيب التحيات،\nفريق عمليات المرافق\nعُمانتل"
  },
  {
    "key": "INFO_REQUIRED",
    "subjectEn": "A Little More Information, Please – {{reference}}",
    "subjectAr": "نحتاج إلى بعض المعلومات الإضافية – {{reference}}",
    "bodyEn": "Dear {{name}},\n\nTo help us respond as quickly as possible, Facility Operations would appreciate a little more information about your request.\n\n{{comment}}\n\nReference: {{reference}}\nLocation: {{location}}\n\nYou can reply by adding a comment to the request.\n\nBest regards,\nFacility Operations Team\nOmantel",
    "bodyAr": "عزيزي/عزيزتي {{name}}،\n\nلمساعدتنا على الاستجابة بأسرع وقت، تحتاج عمليات المرافق إلى بعض المعلومات الإضافية حول طلبك.\n\n{{comment}}\n\nالرقم المرجعي: {{reference}}\nالموقع: {{location}}\n\nيمكنك الرد بإضافة تعليق على الطلب.\n\nمع أطيب التحيات،\nفريق عمليات المرافق\nعُمانتل"
  },
  {
    "key": "RESOLVED",
    "subjectEn": "Facility Request Resolved – {{reference}}",
    "subjectAr": "تم حل طلب المرافق – {{reference}}",
    "bodyEn": "Dear {{name}},\n\nWe are pleased to inform you that your reported facility issue has been resolved.\n\nReference: {{reference}}\nLocation: {{location}}\nStatus: {{status}}\n\nThank you for helping us maintain a safe, clean, and comfortable workplace. Please let us know if everything is as it should be.\n\nBest regards,\nFacility Operations Team\nOmantel",
    "bodyAr": "عزيزي/عزيزتي {{name}}،\n\nيسعدنا إبلاغك بأنه تم حل الملاحظة التي أبلغت عنها.\n\nالرقم المرجعي: {{reference}}\nالموقع: {{location}}\nالحالة: {{status}}\n\nشكرًا لمساعدتنا في الحفاظ على بيئة عمل آمنة ونظيفة ومريحة. أخبرنا إن كان كل شيء على ما يرام.\n\nمع أطيب التحيات،\nفريق عمليات المرافق\nعُمانتل"
  },
  {
    "key": "REOPENED",
    "subjectEn": "We're Following Up on Your Request – {{reference}}",
    "subjectAr": "نتابع طلبك من جديد – {{reference}}",
    "bodyEn": "Dear {{name}},\n\nThank you for letting us know. Your request has been reopened and Facility Operations will follow up.\n\nReference: {{reference}}\nLocation: {{location}}\nStatus: {{status}}\n\nBest regards,\nFacility Operations Team\nOmantel",
    "bodyAr": "عزيزي/عزيزتي {{name}}،\n\nشكرًا لإبلاغنا. تمت إعادة فتح طلبك وستتابعه عمليات المرافق.\n\nالرقم المرجعي: {{reference}}\nالموقع: {{location}}\nالحالة: {{status}}\n\nمع أطيب التحيات،\nفريق عمليات المرافق\nعُمانتل"
  },
  {
    "key": "CLOSED",
    "subjectEn": "Facility Request Closed – {{reference}}",
    "subjectAr": "تم إغلاق طلب المرافق – {{reference}}",
    "bodyEn": "Dear {{name}},\n\nYour request has been closed. Thank you for using Omantel Facility Hub. Together, we keep our workplace at its best.\n\nReference: {{reference}}\nLocation: {{location}}\n\nBest regards,\nFacility Operations Team\nOmantel",
    "bodyAr": "عزيزي/عزيزتي {{name}}،\n\nتم إغلاق طلبك. شكرًا لاستخدامك مركز مرافق عُمانتل. معًا، نحافظ على بيئة عملنا في أفضل حال.\n\nالرقم المرجعي: {{reference}}\nالموقع: {{location}}\n\nمع أطيب التحيات،\nفريق عمليات المرافق\nعُمانتل"
  },
  {
    "key": "OVERDUE",
    "subjectEn": "Overdue Facility Request – {{reference}}",
    "subjectAr": "طلب مرافق متأخر – {{reference}}",
    "bodyEn": "The resolution target for request {{reference}} has passed.\n\nLocation: {{location}}\nStatus: {{status}}",
    "bodyAr": "انقضى موعد الحل المستهدف للطلب {{reference}}.\n\nالموقع: {{location}}\nالحالة: {{status}}"
  },
  {
    "key": "ESCALATED",
    "subjectEn": "Escalated Facility Request – {{reference}}",
    "subjectAr": "تصعيد طلب مرافق – {{reference}}",
    "bodyEn": "Request {{reference}} has been escalated.\n\nReason: {{comment}}\nLocation: {{location}}\nStatus: {{status}}",
    "bodyAr": "تم تصعيد الطلب {{reference}}.\n\nالسبب: {{comment}}\nالموقع: {{location}}\nالحالة: {{status}}"
  }
];

export async function seedFacility(db: Db) {
  // ---- Building, wings, verified basements ----
  const building = await db.facBuilding.upsert({
    where: { code: "HQ" },
    update: {},
    create: { code: "HQ", nameEn: "Omantel Building", nameAr: "مبنى عُمانتل", sortOrder: 0 },
  });
  for (const [i, w] of [["SUN", "Sun Wing", "جناح الشمس"], ["MOON", "Moon Wing", "جناح القمر"]].entries()) {
    await db.facWing.upsert({ where: { buildingId_code: { buildingId: building.id, code: w[0] } }, update: {}, create: { buildingId: building.id, code: w[0], nameEn: w[1], nameAr: w[2], sortOrder: i } });
  }
  for (const [fi, f] of FLOORS.entries()) {
    const floor = await db.facFloor.upsert({
      where: { buildingId_code: { buildingId: building.id, code: f.code } },
      update: {},
      create: { buildingId: building.id, code: f.code, nameEn: f.nameEn, nameAr: f.nameAr, level: f.level, sortOrder: 10 + fi },
    });
    if ((await db.facArea.count({ where: { floorId: floor.id } })) === 0) {
      for (const [ai, a] of f.areas.entries()) {
        const x = a as { kind: string; nameEn: string; nameAr: string; fields: readonly string[]; isOther?: boolean; scope?: boolean; descEn?: string; descAr?: string };
        await db.facArea.create({
          data: {
            floorId: floor.id, kind: x.kind, nameEn: x.nameEn, nameAr: x.nameAr, fields: [...x.fields], isOther: !!x.isOther, sortOrder: ai,
            descEn: x.descEn ?? "", descAr: x.descAr ?? "",
            scopeNoteEn: x.scope ? CLINICAL_SCOPE_EN : "", scopeNoteAr: x.scope ? CLINICAL_SCOPE_AR : "",
          },
        });
      }
    }
  }

  // ---- Categories and problems ----
  for (const [ci, c] of CATEGORIES.entries()) {
    const cat = await db.facCategory.upsert({
      where: { key: c.key },
      update: {},
      create: { key: c.key, service: c.service, nameEn: c.en, nameAr: c.ar, icon: c.icon, sortOrder: ci },
    });
    if ((await db.facIssue.count({ where: { categoryId: cat.id } })) === 0) {
      for (const [ii, i] of c.issues.entries()) {
        await db.facIssue.create({
          data: { categoryId: cat.id, nameEn: i.en, nameAr: i.ar, areaKinds: i.kinds ?? [], floorCodes: i.floors ?? [], defaultPriority: i.p ?? "MEDIUM", safetyRisk: !!i.safety, sortOrder: ii },
        });
      }
    }
  }

  for (const t of TEMPLATES) {
    const existing = await db.facEmailTemplate.findUnique({ where: { key: t.key } });
    if (!existing) await db.facEmailTemplate.create({ data: t });
    else {
      // Upgrade only templates that still hold the previous default wording; administrator edits are kept.
      const prev = PREVIOUS_TEMPLATES.find((p) => p.key === t.key);
      const untouched = prev && (["subjectEn", "subjectAr", "bodyEn", "bodyAr"] as const).every((f) => existing[f] === prev[f]);
      if (untouched) await db.facEmailTemplate.update({ where: { key: t.key }, data: t });
    }
  }
  await db.facSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  // SLA rows exist for every priority; targets stay empty (no target) unless sample data is loaded.
  for (const p of ["LOW", "MEDIUM", "HIGH", "EMERGENCY"] as FacPriority[]) {
    await db.facSlaPolicy.upsert({ where: { priority: p }, update: {}, create: { priority: p, businessHoursOnly: p !== "EMERGENCY" } });
  }

  const sample = process.env.FAC_SAMPLE_DATA !== "false" && process.env.NODE_ENV !== "production";
  if (sample) await seedSample(db);

  // Bootstrap administrator for production (signs in with Microsoft Entra ID; no password).
  const adminEmail = process.env.FAC_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail) {
    await db.facUser.upsert({ where: { email: adminEmail }, update: { role: "ADMIN", active: true }, create: { email: adminEmail, name: adminEmail.split("@")[0], role: "ADMIN" } });
  }

  const counts = await Promise.all([db.facFloor.count(), db.facArea.count(), db.facCategory.count(), db.facIssue.count(), db.facRequest.count()]);
  console.log(`Facility Hub: ${counts[0]} floors, ${counts[1]} areas, ${counts[2]} categories, ${counts[3]} problems, ${counts[4]} requests.`);
}

// ------------------------------------------------------------------------------------------
// Development sample data (clearly flagged)
// ------------------------------------------------------------------------------------------

const SAMPLE_TEAMS = [
  ["GENERAL", "General Maintenance (sample)", "الصيانة العامة (تجريبي)"],
  ["HVAC", "HVAC Team (sample)", "فريق التكييف (تجريبي)"],
  ["ELECTRICAL", "Electrical Team (sample)", "فريق الكهرباء (تجريبي)"],
  ["PLUMBING", "Plumbing Team (sample)", "فريق السباكة (تجريبي)"],
  ["CLEANING", "Cleaning Team (sample)", "فريق النظافة (تجريبي)"],
  ["CIVIL", "Civil Works (sample)", "الأعمال المدنية (تجريبي)"],
  ["ELEVATOR", "Elevator Maintenance (sample)", "صيانة المصاعد (تجريبي)"],
  ["PEST", "Pest Control (sample)", "مكافحة الآفات (تجريبي)"],
  ["PARKING", "Parking Facilities (sample)", "مرافق المواقف (تجريبي)"],
] as const;

const ROUTES: [string, string][] = [
  ["hvac", "HVAC"], ["electrical", "ELECTRICAL"], ["plumbing", "PLUMBING"], ["doors", "GENERAL"], ["civil", "CIVIL"], ["furniture", "GENERAL"],
  ["elevators", "ELEVATOR"], ["parking", "PARKING"], ["ventilation", "HVAC"], ["signage", "GENERAL"], ["c-pest", "PEST"],
];

async function seedSample(db: Db) {
  if ((await db.facTeam.count()) === 0) {
    for (const [specialty, en, ar] of SAMPLE_TEAMS) {
      await db.facTeam.create({ data: { specialty, nameEn: en, nameAr: ar, kind: "INTERNAL", scopeConfirmed: true, isSample: true } });
    }
    // Approved contractor placeholder: cannot receive requests until an administrator confirms its scope.
    await db.facTeam.create({
      data: { specialty: "GENERAL", nameEn: "Bahwan (scope to be confirmed)", nameAr: "بهوان (النطاق قيد التأكيد)", kind: "CONTRACTOR", scopeConfirmed: false, isSample: true, notes: "Confirm the contracted scope before enabling assignments." },
    });
  }
  const teams = await db.facTeam.findMany();
  const teamBy = (s: string) => teams.find((t) => t.specialty === s && t.kind === "INTERNAL")!;

  if ((await db.facRoutingRule.count()) === 0) {
    let order = 0;
    for (const [key, spec] of ROUTES) {
      const cat = await db.facCategory.findUnique({ where: { key } });
      if (cat) await db.facRoutingRule.create({ data: { categoryId: cat.id, teamId: teamBy(spec).id, sortOrder: order++ } });
    }
    await db.facRoutingRule.create({ data: { service: "CLEANING", teamId: teamBy("CLEANING").id, sortOrder: order++ } });
    await db.facRoutingRule.create({ data: { service: "MAINTENANCE", teamId: teamBy("GENERAL").id, sortOrder: order++ } });
  }

  // SAMPLE SLA targets — placeholders for development, flagged isSample. Replace with approved values.
  const slaSample: Record<FacPriority, [number, number]> = { EMERGENCY: [30, 240], HIGH: [120, 960], MEDIUM: [240, 2400], LOW: [480, 4800] };
  for (const [p, [resp, res]] of Object.entries(slaSample) as [FacPriority, [number, number]][]) {
    const row = await db.facSlaPolicy.findUnique({ where: { priority: p } });
    if (row && row.responseMinutes == null && row.resolutionMinutes == null) {
      await db.facSlaPolicy.update({ where: { priority: p }, data: { responseMinutes: resp, resolutionMinutes: res, isSample: true } });
    }
  }

  const password = process.env.FAC_DEV_PASSWORD || "FacilityHub-Dev-2026";
  const passwordHash = await hash(password);
  const users = [
    { email: "employee@facility-hub.test", name: "Sample Employee", role: "EMPLOYEE" as const, department: "Customer Experience (sample)", phone: "+968 0000 0001" },
    { email: "employee2@facility-hub.test", name: "Second Sample Employee", role: "EMPLOYEE" as const, department: "Finance (sample)", phone: "+968 0000 0002" },
    { email: "agent@facility-hub.test", name: "Sample Operations Agent", role: "AGENT" as const, department: "Facility Operations", phone: "" },
    { email: "admin@facility-hub.test", name: "Sample Operations Admin", role: "ADMIN" as const, department: "Facility Operations", phone: "" },
    { email: "contractor@facility-hub.test", name: "Sample HVAC Technician", role: "CONTRACTOR" as const, department: "", phone: "", teamId: teamBy("HVAC").id },
  ];
  for (const u of users) {
    await db.facUser.upsert({ where: { email: u.email }, update: {}, create: { ...u, passwordHash, isSample: true, locale: "ar" } });
  }

  if ((await db.facRequest.count()) > 0) return;
  await seedSampleRequests(db);
}

async function seedSampleRequests(db: Db) {
  const employees = await db.facUser.findMany({ where: { role: "EMPLOYEE", isSample: true }, orderBy: { email: "asc" } });
  const agent = await db.facUser.findFirstOrThrow({ where: { role: "AGENT", isSample: true } });
  const floors = await db.facFloor.findMany({ include: { areas: true, building: true } });
  const issues = await db.facIssue.findMany({ include: { category: true } });
  const routes = await db.facRoutingRule.findMany({ include: { team: true }, orderBy: { sortOrder: "asc" } });
  const policies = await db.facSlaPolicy.findMany();
  const cal: BusinessCalendar = { timezone: "Asia/Muscat", workStart: "07:30", workEnd: "15:30", workDays: [0, 1, 2, 3, 4], holidays: [] };

  const find = (floor: string, kind: string) => {
    const f = floors.find((x) => x.code === floor)!;
    return { f, a: f.areas.find((a) => a.kind === kind)! };
  };
  const issue = (en: string, service: FacService) => issues.find((i) => i.nameEn === en && i.category.service === service)!;

  type S = { floor: string; kind: string; issue: string; service: FacService; desc: string; status: FacStatus; days: number; p?: FacPriority; detail?: Record<string, string>; rating?: number; emp?: number };
  const SAMPLES: S[] = [
    { floor: "B1", kind: "PARKING", issue: "Lighting failure", service: "MAINTENANCE", desc: "Sample: two ceiling lights are off near the ramp.", status: "IN_PROGRESS", days: 1, detail: { column: "C-14" } },
    { floor: "B1", kind: "MEETING_ROOMS", issue: "Air conditioning", service: "MAINTENANCE", desc: "Sample: the room is too warm during afternoon meetings.", status: "ASSIGNED", days: 2, detail: { meetingRoom: "Sample room" } },
    { floor: "B1", kind: "RESTROOMS", issue: "Soap refill", service: "CLEANING", desc: "Sample: soap dispensers are empty.", status: "RESOLVED", days: 3, p: "LOW" },
    { floor: "B1", kind: "RESTROOMS", issue: "Water leakage", service: "MAINTENANCE", desc: "Sample: water leaking under the second sink.", status: "CLOSED", days: 12, p: "HIGH", rating: 5 },
    { floor: "B1", kind: "EVENT_AREA", issue: "Post-event cleaning", service: "CLEANING", desc: "Sample: cleaning needed after the morning session.", status: "CLOSED", days: 20, rating: 4, emp: 1 },
    { floor: "B1", kind: "EVENT_AREA", issue: "Furniture", service: "MAINTENANCE", desc: "Sample: a table leg is loose.", status: "SUBMITTED", days: 0 },
    { floor: "B1", kind: "CLINIC", issue: "Air conditioning", service: "MAINTENANCE", desc: "Sample: the waiting area AC is noisy.", status: "UNDER_REVIEW", days: 1, emp: 1 },
    { floor: "B1", kind: "PHARMACY", issue: "Doors and locks", service: "MAINTENANCE", desc: "Sample: the door closer is slow.", status: "ON_HOLD", days: 6 },
    { floor: "B2", kind: "PARKING", issue: "Oil stains", service: "CLEANING", desc: "Sample: oil stain across two spaces.", status: "RESOLVED", days: 4, detail: { parkingSpace: "S-01" }, emp: 1 },
    { floor: "B2", kind: "PARKING", issue: "Parking gate or barrier malfunction", service: "MAINTENANCE", desc: "Sample: the exit barrier does not lift on the first try.", status: "IN_PROGRESS", days: 5, p: "HIGH" },
    { floor: "B2", kind: "PARKING", issue: "Drainage problems", service: "MAINTENANCE", desc: "Sample: standing water after cleaning.", status: "CLOSED", days: 35, rating: 3 },
    { floor: "B2", kind: "PARKING", issue: "Drainage problems", service: "MAINTENANCE", desc: "Sample: standing water again in the same place.", status: "REOPENED", days: 9 },
    { floor: "B3", kind: "PARKING", issue: "Ventilation problems", service: "MAINTENANCE", desc: "Sample: the air feels stale near the lifts.", status: "ASSIGNED", days: 8, detail: { elevator: "Sample lift" }, emp: 1 },
    { floor: "B3", kind: "PARKING", issue: "Waste removal", service: "CLEANING", desc: "Sample: waste left near the stairwell.", status: "SUBMITTED", days: 0 },
    { floor: "B3", kind: "PARKING", issue: "Damaged directional signs", service: "MAINTENANCE", desc: "Sample: exit sign hanging loose.", status: "CLOSED", days: 50, rating: 5 },
    { floor: "B3", kind: "PARKING", issue: "Pest complaints", service: "CLEANING", desc: "Sample: insects seen near the drains.", status: "CANCELLED", days: 15 },
  ];

  const counter = new Map<number, number>();
  for (const s of SAMPLES) {
    const { f, a } = find(s.floor, s.kind);
    const iss = issue(s.issue, s.service);
    const emp = employees[s.emp ?? 0];
    const createdAt = new Date(Date.now() - s.days * 864e5 - 3 * 36e5);
    const year = createdAt.getUTCFullYear();
    const seq = (counter.get(year) ?? 0) + 1;
    counter.set(year, seq);
    const priority = s.p ?? iss.defaultPriority;
    const policy = policies.find((p) => p.priority === priority);
    const due = (m: number | null | undefined) => (m ? (policy!.businessHoursOnly ? addBusinessMinutes(createdAt, m, cal) : new Date(createdAt.getTime() + m * 60_000)) : null);
    const route = routes.find((r) => (!r.service || r.service === s.service) && (!r.categoryId || r.categoryId === iss.categoryId));
    const assigned = !["SUBMITTED", "UNDER_REVIEW", "CANCELLED"].includes(s.status);
    const resolved = ["RESOLVED", "CLOSED", "REOPENED"].includes(s.status);
    const resolvedAt = resolved ? new Date(createdAt.getTime() + Math.min(s.days, 3) * 864e5 * 0.6 + 2 * 36e5) : null;
    const detailParts = Object.values(s.detail ?? {});
    const req = await db.facRequest.create({
      data: {
        reference: formatReference(year, seq),
        employeeId: emp.id, employeeName: emp.name, employeeEmail: emp.email, contactPhone: emp.phone, department: emp.department,
        service: s.service, categoryId: iss.categoryId, issueId: iss.id,
        buildingId: f.buildingId, floorId: f.id, areaId: a.id,
        locationLabelEn: [f.building.nameEn, f.nameEn, a.nameEn, ...detailParts].join(" · "),
        locationLabelAr: [f.building.nameAr, f.nameAr, a.nameAr, ...detailParts].join(" · "),
        locationDetail: s.detail ?? {},
        description: s.desc, priority, status: s.status === "REOPENED" ? "REOPENED" : s.status,
        teamId: assigned ? route?.teamId : null,
        responseDueAt: due(policy?.responseMinutes), resolutionDueAt: due(policy?.resolutionMinutes),
        firstResponseAt: s.status === "SUBMITTED" ? null : new Date(createdAt.getTime() + 50 * 60_000),
        resolvedAt: s.status === "REOPENED" ? null : resolvedAt,
        closedAt: s.status === "CLOSED" ? new Date((resolvedAt ?? createdAt).getTime() + 864e5) : null,
        rating: s.rating ?? null, reopenCount: s.status === "REOPENED" ? 1 : 0, isSample: true, createdAt,
      },
    });
    const ev = (minutes: number, data: Omit<Parameters<typeof db.facRequestEvent.create>[0]["data"], "requestId" | "createdAt">) =>
      db.facRequestEvent.create({ data: { ...data, requestId: req.id, createdAt: new Date(createdAt.getTime() + minutes * 60_000) } as never });
    await ev(0, { type: "STATUS", status: "SUBMITTED", actorId: emp.id, actorName: emp.name, actorRole: "EMPLOYEE" });
    if (s.status === "SUBMITTED") continue;
    if (s.status === "CANCELLED") {
      await ev(30, { type: "STATUS", status: "CANCELLED", actorId: emp.id, actorName: emp.name, actorRole: "EMPLOYEE", comment: "Sample: no longer needed." });
      continue;
    }
    await ev(50, { type: "STATUS", status: "UNDER_REVIEW", actorId: agent.id, actorName: agent.name, actorRole: "AGENT" });
    if (s.status === "UNDER_REVIEW") continue;
    const team = route?.team;
    await ev(70, { type: "ASSIGN", status: "ASSIGNED", actorId: agent.id, actorName: agent.name, actorRole: "AGENT", data: { teamId: team?.id, teamEn: team?.nameEn, teamAr: team?.nameAr } });
    await ev(75, { type: "COMMENT", actorId: agent.id, actorName: agent.name, actorRole: "AGENT", comment: "Sample internal note: check access with security first.", internal: true });
    if (s.status === "ASSIGNED") continue;
    if (s.status === "ON_HOLD") {
      await ev(200, { type: "STATUS", status: "ON_HOLD", actorId: agent.id, actorName: agent.name, actorRole: "AGENT", comment: "Sample: waiting for a spare part." });
      continue;
    }
    await ev(180, { type: "STATUS", status: "IN_PROGRESS", actorId: agent.id, actorName: agent.name, actorRole: "AGENT", comment: "Sample: the team is on site." });
    if (s.status === "IN_PROGRESS") continue;
    const rMin = Math.round(((resolvedAt?.getTime() ?? createdAt.getTime()) - createdAt.getTime()) / 60_000);
    await ev(rMin, { type: "STATUS", status: "RESOLVED", actorId: agent.id, actorName: agent.name, actorRole: "AGENT", comment: "Sample: fixed and tested." });
    if (s.status === "CLOSED") {
      await ev(rMin + 1440, { type: "STATUS", status: "CLOSED", actorId: emp.id, actorName: emp.name, actorRole: "EMPLOYEE" });
      if (s.rating) await ev(rMin + 1441, { type: "FEEDBACK", actorId: emp.id, actorName: emp.name, actorRole: "EMPLOYEE", data: { rating: s.rating } });
    }
    if (s.status === "REOPENED") await ev(rMin + 600, { type: "STATUS", status: "REOPENED", actorId: emp.id, actorName: emp.name, actorRole: "EMPLOYEE", comment: "Sample: the water came back." });
  }
  for (const [year, value] of counter) {
    await db.$executeRaw`INSERT INTO "FacCounter" ("year", "value") VALUES (${year}, ${value}) ON CONFLICT ("year") DO UPDATE SET "value" = GREATEST("FacCounter"."value", ${value})`;
  }
}

// Allow `tsx prisma/seed-facility.ts` on its own.
if (process.argv[1]?.endsWith("seed-facility.ts")) {
  const db = new PrismaClient();
  seedFacility(db)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
