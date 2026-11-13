import "server-only";
import { db } from "@/lib/db";
import type { BusinessCalendar } from "../domain/sla";

export async function getSettings() {
  return db.facSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export async function getCalendar(): Promise<BusinessCalendar> {
  const [s, holidays] = await Promise.all([getSettings(), db.facHoliday.findMany({ select: { date: true } })]);
  return {
    timezone: s.timezone,
    workStart: s.workStart,
    workEnd: s.workEnd,
    workDays: s.workDays,
    holidays: holidays.map((h) => h.date.toISOString().slice(0, 10)),
  };
}
