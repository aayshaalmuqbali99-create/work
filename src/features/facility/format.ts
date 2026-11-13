/** Locale-aware formatting (Gregorian calendar with Latin digits in both languages for clarity in references and dates). */
const tz = "Asia/Muscat";

export function formatDate(d: Date | string, locale: string, withTime = false) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-OM-u-nu-latn-ca-gregory" : "en-GB", {
    timeZone: tz,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function relativeTime(d: Date | string, locale: string, now = Date.now()) {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (date.getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(date, locale);
}

export function durationLabel(minutes: number, locale: string) {
  const ar = locale === "ar";
  if (minutes < 60) return ar ? `${Math.round(minutes)} دقيقة` : `${Math.round(minutes)} min`;
  const h = minutes / 60;
  if (h < 48) return ar ? `${h.toFixed(1)} ساعة` : `${h.toFixed(1)} h`;
  return ar ? `${(h / 24).toFixed(1)} يوم` : `${(h / 24).toFixed(1)} d`;
}

export const pickName = (o: { nameEn: string; nameAr: string } | null | undefined, locale: string) => (o ? (locale === "ar" ? o.nameAr || o.nameEn : o.nameEn || o.nameAr) : "");
