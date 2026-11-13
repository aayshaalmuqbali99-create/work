import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { requireFacPage } from "@/features/facility/server/guard";
import { getAnalytics, type Range } from "@/features/facility/server/analytics";
import { durationLabel, pickName } from "@/features/facility/format";
import { BarList, KpiTile, PairedBars, SplitBar, TrendChart } from "@/components/facility/charts";
import { fhCard } from "@/components/facility/ui";

const RANGES: Range[] = ["30", "90", "365", "all"];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireFacPage("ops.analytics");
  const sp = await searchParams;
  const range: Range = RANGES.includes(sp.range as Range) ? (sp.range as Range) : "90";
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const a = await getAnalytics(range);
  const other = t("Common.other");
  const label = (x: { label: { nameEn: string; nameAr: string } | null }) => (x.label ? pickName(x.label, locale) : other);
  const month = (key: string) => new Intl.DateTimeFormat(locale === "ar" ? "ar-OM-u-nu-latn" : "en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`));
  const noData = t("Ops.analytics.noData");
  const card = `${fhCard} p-5`;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-fink">{t("Ops.analytics.title")}</h1>
        <nav aria-label={t("Ops.analytics.range")} className="flex rounded-full border border-fline bg-white p-1">
          {RANGES.map((r) => (
            <Link key={r} href={`/facility/ops/analytics?range=${r}`} aria-current={r === range ? "page" : undefined} className={cn("rounded-full px-3.5 py-1.5 text-sm font-semibold transition", r === range ? "bg-deep text-white" : "text-fmuted hover:text-deep")}>
              {t(`Ops.analytics.${r === "all" ? "all" : `d${r}`}`)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label={t("Ops.analytics.requests")} value={a.total} tone="accent" />
        <KpiTile label={t("Ops.analytics.resolved")} value={a.resolvedCount} />
        <KpiTile label={t("Ops.analytics.avgResolution")} value={a.avgResolutionMin == null ? "—" : durationLabel(a.avgResolutionMin, locale)} />
        <KpiTile label={t("Ops.analytics.slaCompliance")} value={a.sla.pct == null ? "—" : `${a.sla.pct}%`} tone={a.sla.pct != null && a.sla.pct >= 90 ? "good" : a.sla.pct != null && a.sla.pct < 70 ? "alert" : "default"} />
      </div>
      {a.sla.withTarget > 0 && <p className="mt-2 text-xs text-fmuted">{t("Ops.analytics.basedOn", { count: a.sla.withTarget })}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={`${card} lg:col-span-2`}>
          <h2 className="mb-4 font-extrabold text-fink">{t("Ops.analytics.monthly")}</h2>
          <TrendChart data={a.months.map((m) => ({ label: month(m.key), a: m.created, b: m.resolved }))} labels={[t("Ops.analytics.requests"), t("Ops.analytics.resolved")]} tableLabel={t("Ops.analytics.monthly")} />
        </section>
        <section className={card}>
          <h2 className="mb-5 font-extrabold text-fink">{t("Ops.analytics.byService")}</h2>
          {a.total === 0 ? <p className="text-sm text-fmuted">{noData}</p> : <SplitBar parts={[{ label: t("Service.MAINTENANCE"), value: a.service.MAINTENANCE }, { label: t("Service.CLEANING"), value: a.service.CLEANING }]} />}
          <h2 className="mb-5 mt-8 font-extrabold text-fink">{t("Ops.analytics.basements")}</h2>
          <BarList empty={noData} total={a.total || undefined} items={a.basements.map((b) => ({ key: b.key, label: b.key, value: b.value }))} />
        </section>
        <section className={`${card} lg:col-span-2`}>
          <h2 className="mb-5 font-extrabold text-fink">{t("Ops.analytics.byFloorService")}</h2>
          <PairedBars
            empty={noData}
            labels={[t("Ops.analytics.maintenanceByFloor"), t("Ops.analytics.cleaningByFloor")]}
            rows={a.floorService.map((f) => ({ key: f.key, label: f.label ? `${f.key} · ${pickName(f.label, locale)}` : t("Wizard.notListedFloor"), a: f.MAINTENANCE, b: f.CLEANING }))}
          />
        </section>
        <section className={card}>
          <h2 className="mb-5 font-extrabold text-fink">{t("Ops.analytics.byWing")}</h2>
          <BarList empty={noData} total={a.total || undefined} items={a.byWing.map((x) => ({ key: x.key, label: x.label ? label(x) : t("Ops.analytics.noWing"), value: x.value }))} />
        </section>
        <section className={card}>
          <h2 className="mb-5 font-extrabold text-fink">{t("Ops.analytics.byArea")}</h2>
          <BarList empty={noData} total={a.total || undefined} items={a.byAreaKind.slice(0, 12).map((x) => ({ key: x.key, label: label(x), value: x.value }))} />
        </section>
        <section className={card}>
          <h2 className="mb-5 font-extrabold text-fink">{t("Ops.analytics.byFloor")}</h2>
          <BarList empty={noData} total={a.total || undefined} items={a.byFloor.map((x) => ({ key: x.key, label: x.label ? `${x.key.slice(2)} · ${label(x)}` : other, value: x.value }))} />
        </section>
        <section className={card}>
          <h2 className="mb-5 font-extrabold text-fink">{t("Ops.analytics.byCategory")}</h2>
          <BarList empty={noData} total={a.total || undefined} items={a.byCategory.slice(0, 12).map((x) => ({ key: x.key, label: label(x), value: x.value }))} />
        </section>
        <section className={card}>
          <h2 className="mb-5 font-extrabold text-fink">{t("Ops.analytics.byTeam")}</h2>
          <BarList empty={noData} items={a.byTeam.map((x) => ({ key: x.key, label: x.label ? label(x) : t("Ops.table.unassigned"), value: x.value }))} />
        </section>
        <section className={`${card} lg:col-span-2`}>
          <h2 className="font-extrabold text-fink">{t("Ops.analytics.recurring")}</h2>
          <p className="mb-5 text-xs text-fmuted">{t("Ops.analytics.recurringHint")}</p>
          <BarList empty={noData} color="#FF7800" items={a.recurring.map((x, i) => ({ key: String(i), label: locale === "ar" ? x.label.ar : x.label.en, value: x.n }))} suffix="×" />
        </section>
      </div>
    </div>
  );
}
