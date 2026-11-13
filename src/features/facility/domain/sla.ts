/**
 * SLA deadline arithmetic. Business hours are evaluated in the configured IANA time zone
 * (Oman has no daylight saving, but the code does not assume that).
 */
export type BusinessCalendar = {
  timezone: string;
  workStart: string; // "07:30"
  workEnd: string; // "15:30"
  workDays: number[]; // 0 = Sunday
  holidays: string[]; // "YYYY-MM-DD" in the calendar's time zone
};

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Local wall-clock parts of an instant in a time zone. */
export function zonedParts(d: Date, timezone: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute), weekday: wd };
}

/**
 * Add `minutes` of working time to `start`. Walks minute-blocks per day, so it is exact
 * to the minute and fast (one loop iteration per calendar day).
 */
export function addBusinessMinutes(start: Date, minutes: number, cal: BusinessCalendar): Date {
  const ws = toMin(cal.workStart);
  const we = toMin(cal.workEnd);
  if (we <= ws || cal.workDays.length === 0) return new Date(start.getTime() + minutes * 60_000);
  const holidays = new Set(cal.holidays);
  let cursor = new Date(start.getTime() - (start.getTime() % 60_000)); // whole minutes
  let remaining = minutes;
  for (let guard = 0; guard < 3660; guard++) {
    const { date, minutes: now, weekday } = zonedParts(cursor, cal.timezone);
    const working = cal.workDays.includes(weekday) && !holidays.has(date);
    if (working && now < we) {
      const from = Math.max(now, ws);
      const available = we - from;
      const jumpToFrom = (from - now) * 60_000;
      if (remaining <= available) return new Date(cursor.getTime() + jumpToFrom + remaining * 60_000);
      remaining -= available;
    }
    // jump to next local midnight
    cursor = new Date(cursor.getTime() + (24 * 60 - now) * 60_000);
  }
  return new Date(start.getTime() + minutes * 60_000);
}

export function computeDeadline(start: Date, minutes: number | null | undefined, businessHoursOnly: boolean, cal: BusinessCalendar): Date | null {
  if (minutes == null || minutes <= 0) return null;
  return businessHoursOnly ? addBusinessMinutes(start, minutes, cal) : new Date(start.getTime() + minutes * 60_000);
}
