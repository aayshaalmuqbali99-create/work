import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { listActivity } from "@/features/admin/queries";

type Entry = Awaited<ReturnType<typeof listActivity>>[number];

const short = (v: unknown) => {
  const s = Array.isArray(v) ? v.join(" · ") : v == null ? "—" : String(v);
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
};

export async function ActivityList({ entries, locale, compact = false }: { entries: Entry[]; locale: string; compact?: boolean }) {
  const t = await getTranslations("Admin");
  if (entries.length === 0) return <p className="text-sm text-muted">{t("noActivity")}</p>;
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-OM-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  return (
    <ul className="divide-y divide-line">
      {entries.map((e) => {
        const after = (e.after ?? {}) as Record<string, unknown>;
        const before = (e.before ?? {}) as Record<string, unknown>;
        const keys = Object.keys(after).filter((k) => k !== "email");
        return (
          <li key={e.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-start sm:gap-4">
            <time className="w-40 shrink-0 text-xs text-muted" dateTime={e.createdAt.toISOString()}>{fmt.format(e.createdAt)}</time>
            <div className="min-w-0 flex-1">
              <p>
                <span className="font-medium text-navy">{e.user?.name ?? t("system")}</span>{" "}
                <code className="rounded bg-canvas px-1.5 py-0.5 text-xs" dir="ltr">{e.action}</code>{" "}
                {e.device && (
                  <Link href={`/admin/devices/${e.entityId}`} className="text-teal hover:underline">
                    {locale === "ar" ? e.device.nameAr || e.device.nameEn : e.device.nameEn}
                  </Link>
                )}
              </p>
              {!compact && keys.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs text-muted">
                  {keys.map((k) => (
                    <li key={k} dir="auto"><span className="font-mono">{k}</span>: {k in before ? <><s>{short(before[k])}</s> → </> : null}{short(after[k])}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
