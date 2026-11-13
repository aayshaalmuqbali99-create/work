"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { actionError, requireFac, type ActionResult } from "../server/guard";
import { facAudit } from "../server/audit";
import { LOCATION_FIELDS } from "../domain/location";

/**
 * Configuration without code: every editable list in the Facility Operations dashboard goes through
 * these three actions, validated per entity with Zod and restricted to administrators.
 */

const name = z.string().trim().min(1).max(120);
const optName = z.string().trim().max(500).default("");
const code = z.string().trim().min(1).max(20).regex(/^[A-Za-z0-9_-]+$/);
const order = z.coerce.number().int().min(0).max(100000).default(0);
const id = z.string().max(40);
const nullableId = z.string().max(40).nullable().transform((v) => v || null);
const list = (max = 30) => z.array(z.string().trim().min(1).max(40)).max(max).default([]);
const minutes = z.union([z.coerce.number().int().min(1).max(525600), z.null()]).transform((v) => v ?? null);

const SCHEMAS = {
  building: z.object({ code, nameEn: name, nameAr: name, active: z.boolean(), sortOrder: order }),
  wing: z.object({ buildingId: id, code, nameEn: name, nameAr: name, active: z.boolean(), sortOrder: order }),
  floor: z.object({ buildingId: id, wingId: nullableId, code, nameEn: name, nameAr: name, level: z.coerce.number().int().min(-20).max(200), active: z.boolean(), sortOrder: order }),
  area: z.object({
    floorId: id, parentId: nullableId, kind: code, nameEn: name, nameAr: name, descEn: optName, descAr: optName, isOther: z.boolean(),
    fields: z.array(z.enum(LOCATION_FIELDS)).default([]), scopeNoteEn: optName, scopeNoteAr: optName, active: z.boolean(), sortOrder: order,
  }),
  category: z.object({ service: z.enum(["MAINTENANCE", "CLEANING"]), key: code, nameEn: name, nameAr: name, icon: z.string().max(40), active: z.boolean(), sortOrder: order }),
  issue: z.object({
    categoryId: id, nameEn: name, nameAr: name, areaKinds: list(), floorCodes: list(), defaultPriority: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]),
    safetyRisk: z.boolean(), active: z.boolean(), sortOrder: order,
  }),
  team: z.object({
    nameEn: name, nameAr: name, kind: z.enum(["INTERNAL", "CONTRACTOR"]), specialty: code, email: z.union([z.literal(""), z.string().trim().email().max(200)]).default(""),
    scopeConfirmed: z.boolean(), notes: optName, active: z.boolean(),
  }),
  rule: z.object({
    service: z.enum(["MAINTENANCE", "CLEANING"]).nullable(), categoryId: nullableId, floorCode: z.string().trim().max(20).nullable().transform((v) => v || null),
    areaKind: z.string().trim().max(40).nullable().transform((v) => v || null), teamId: id, autoAssign: z.boolean(), active: z.boolean(), sortOrder: order,
  }),
  sla: z.object({ responseMinutes: minutes, resolutionMinutes: minutes, businessHoursOnly: z.boolean() }),
  settings: z.object({
    timezone: z.string().max(60).refine((tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } }),
    workStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), workEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    workDays: z.array(z.number().int().min(0).max(6)).max(7), reopenDays: z.coerce.number().int().min(0).max(90),
    escalationEmails: z.string().max(1000).refine((s) => s.split(",").map((x) => x.trim()).filter(Boolean).every((x) => z.string().email().safeParse(x).success)),
    emergencyContactEn: optName, emergencyContactAr: optName,
  }),
  holiday: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), nameEn: name, nameAr: name }),
  template: z.object({ subjectEn: z.string().trim().min(1).max(200), subjectAr: z.string().trim().min(1).max(200), bodyEn: z.string().trim().min(1).max(5000), bodyAr: z.string().trim().min(1).max(5000), active: z.boolean() }),
  user: z.object({
    email: z.string().trim().toLowerCase().email().max(200), name, role: z.enum(["EMPLOYEE", "CONTRACTOR", "AGENT", "ADMIN"]), teamId: nullableId,
    department: optName, phone: z.string().trim().max(40).default(""), active: z.boolean(),
  }),
} as const;

export type ConfigEntity = keyof typeof SCHEMAS;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Delegate = { create: (a: any) => Promise<{ id: string | number }>; update: (a: any) => Promise<unknown>; delete: (a: any) => Promise<unknown>; findUnique: (a: any) => Promise<any>; findMany: (a: any) => Promise<any[]> };
const delegate = (e: ConfigEntity): Delegate =>
  ({
    building: db.facBuilding, wing: db.facWing, floor: db.facFloor, area: db.facArea, category: db.facCategory, issue: db.facIssue,
    team: db.facTeam, rule: db.facRoutingRule, sla: db.facSlaPolicy, settings: db.facSettings, holiday: db.facHoliday, template: db.facEmailTemplate, user: db.facUser,
  })[e] as unknown as Delegate;

const refresh = () => revalidatePath("/[locale]/facility", "layout");

export async function saveConfigAction(entity: ConfigEntity, recordId: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireFac(entity === "user" ? "users.manage" : "config.manage");
    const schema = SCHEMAS[entity];
    if (!schema) return { ok: false, error: "invalid" };
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const i of parsed.error.issues) fields[String(i.path[0])] = i.message;
      return { ok: false, error: "invalid", fields };
    }
    let data: Record<string, unknown> = { ...parsed.data };
    if (entity === "holiday") data = { ...data, date: new Date(`${data.date}T00:00:00Z`) };
    if (entity === "sla") data = { ...data, isSample: false };
    if (entity === "user") {
      if (data.role !== "CONTRACTOR") data.teamId = null;
      if (recordId === user.id && (data.role !== "ADMIN" || !data.active)) return { ok: false, error: "self" };
    }
    if (entity === "rule" && data.teamId) {
      const team = await db.facTeam.findUnique({ where: { id: String(data.teamId) } });
      if (!team || (team.kind === "CONTRACTOR" && !team.scopeConfirmed)) return { ok: false, error: "scope", fields: { teamId: "scope" } };
    }
    const d = delegate(entity);
    let savedId: string;
    if (entity === "settings") {
      await db.facSettings.upsert({ where: { id: 1 }, update: data as Prisma.FacSettingsUpdateInput, create: { id: 1, ...(data as object) } });
      savedId = "1";
    } else if (recordId) {
      const before = await d.findUnique({ where: { id: recordId } });
      if (!before) return { ok: false, error: "invalid" };
      await d.update({ where: { id: recordId }, data });
      savedId = recordId;
    } else {
      if (entity === "sla" || entity === "template") return { ok: false, error: "invalid" };
      savedId = String((await d.create({ data })).id);
    }
    await facAudit(user, `${entity}.${recordId ? "update" : "create"}`, entity, savedId, parsed.data as Prisma.InputJsonValue);
    refresh();
    return { ok: true, data: { id: savedId } };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "duplicate", fields: { code: "duplicate", key: "duplicate", email: "duplicate", date: "duplicate" } };
    return actionError(e);
  }
}

/** Only items that are safe to remove can be deleted; everything else is deactivated to keep history. */
const DELETABLE: ConfigEntity[] = ["rule", "holiday"];
export async function deleteConfigAction(entity: ConfigEntity, recordId: string): Promise<ActionResult> {
  try {
    const user = await requireFac("config.manage");
    if (!DELETABLE.includes(entity)) return { ok: false, error: "forbidden" };
    await delegate(entity).delete({ where: { id: recordId } });
    await facAudit(user, `${entity}.delete`, entity, recordId);
    refresh();
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

/** Move an item up/down among its siblings by swapping sortOrder (renumbers the group first). */
const SIBLINGS: Partial<Record<ConfigEntity, string>> = { wing: "buildingId", floor: "buildingId", area: "floorId", category: "service", issue: "categoryId", rule: "" , building: "" };
export async function moveConfigAction(entity: ConfigEntity, recordId: string, dir: -1 | 1): Promise<ActionResult> {
  try {
    const user = await requireFac("config.manage");
    if (!(entity in SIBLINGS)) return { ok: false, error: "invalid" };
    const d = delegate(entity);
    const row = await d.findUnique({ where: { id: recordId } });
    if (!row) return { ok: false, error: "invalid" };
    const key = SIBLINGS[entity];
    const all = await d.findMany({ where: key ? { [key]: row[key] } : {}, orderBy: [{ sortOrder: "asc" }], select: { id: true } });
    const i = all.findIndex((x: { id: string }) => x.id === recordId);
    const j = i + dir;
    if (j < 0 || j >= all.length) return { ok: true };
    [all[i], all[j]] = [all[j], all[i]];
    await db.$transaction(all.map((x: { id: string }, n: number) => (d as unknown as { update: (a: object) => Prisma.PrismaPromise<unknown> }).update({ where: { id: x.id }, data: { sortOrder: n } })));
    await facAudit(user, `${entity}.reorder`, entity, recordId, { dir });
    refresh();
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

/** New random QR token for an area (old printed codes stop working). */
export async function regenerateQrAction(areaId: string): Promise<ActionResult> {
  try {
    const user = await requireFac("config.manage");
    await db.facArea.update({ where: { id: areaId }, data: { qrToken: `q${randomBytes(12).toString("hex")}` } });
    await facAudit(user, "area.qr_regenerate", "area", areaId);
    refresh();
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
