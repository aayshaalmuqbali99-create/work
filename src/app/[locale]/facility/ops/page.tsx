import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle, ArrowUpRight, Siren, Clock, Inbox } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { KpiTile, BarList } from "@/components/facility/charts";
import { PriorityChip, StatusChip, fhCard } from "@/components/facility/ui";
import { requireFacPage } from "@/features/facility/server/guard";
import { visibleWhere, OPEN_STATUSES } from "@/features/facility/server/queries";
import { getKpis } from "@/features/facility/server/analytics";
import { formatDate, pickName, relativeTime } from "@/features/facility/format";
import { FINISHED } from "@/features/facility/domain/status";
import { PurgeSampleButton } from "@/components/facility/ops/small-actions";
import { can } from "@/features/facility/domain/permissions";

export default async function OpsDashboard() {
  const user = await requireFacPage("ops.view");
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const where = visibleWhere(user);
  const now = new Date();
  const [k, attention, latest, floors, openByStatus, hasSample] = await Promise.all([
    getKpis(where),
    db.facRequest.findMany({
      where: { ...where, status: { notIn: [...FINISHED] }, OR: [{ resolutionDueAt: { lt: now } }, { teamId: null }, { priority: "EMERGENCY" }, { escalationLevel: { gt: 0 } }] },
      orderBy: [{ priority: "desc" }, { resolutionDueAt: "asc" }],
      take: 8,
      include: { issue: true, floor: true, team: true },
    }),
    db.facRequest.findMany({ where, orderBy: { createdAt: "desc" }, take: 6, include: { issue: true, floor: true } }),
    db.facRequest.groupBy({ by: ["floorId"], where: { ...where, status: { in: OPEN_STATUSES } }, _count: true }),
    db.facRequest.groupBy({ by: ["status"], where: { ...where, status: { in: OPEN_STATUSES } }, _count: true }),
    db.facRequest.count({ where: { isSample: true } }),
  ]);
  const floorRows = await db.facFloor.findMany({ where: { id: { in: floors.map((f) => f.floorId).filter((x): x is string => !!x) } } });

  const kpis: { key: string; label: string; value: number; href: string; tone?: "alert" | "accent" | "good" }[] = [
    { key: "total", label: t("Ops.kpi.total"), value: k.total, href: "", tone: "accent" },
    { key: "new", label: t("Ops.kpi.new"), value: k.newCount, href: "?status=SUBMITTED" },
    ...(["UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"] as const).map((s) => ({ key: s, label: t(`Ops.kpi.${s}`), value: k.s[s] ?? 0, href: `?status=${s}` })),
    { key: "overdue", label: t("Ops.kpi.overdue"), value: k.overdue, href: "?overdue=1", tone: k.overdue ? "alert" : undefined },
    { key: "emergency", label: t("Ops.kpi.emergency"), value: k.emergency, href: "?priority=EMERGENCY&open=1", tone: k.emergency ? "alert" : undefined },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-deep">{t("Ops.commandCenter")}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-fink">{t("Ops.nav.dashboard")}</h1>
        </div>
        {hasSample > 0 && can(user.role, "config.manage") && <PurgeSampleButton />}
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((x) => (
          <li key={x.key}>
            <Link href={`/facility/ops/requests${x.href}`} className="group block h-full">
              <KpiTile label={x.label} value={x.value} tone={x.tone} icon={x.key === "overdue" ? <Clock className="size-4 text-red-600" /> : x.key === "emergency" ? <Siren className="size-4 text-red-600" /> : undefined} />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className={`${fhCard} p-5`}>
          <h2 className="flex items-center gap-2 font-extrabold text-fink"><AlertTriangle className="size-5 text-gold" aria-hidden="true" /> {t("Ops.attention")}</h2>
          {attention.length === 0 ? (
            <p className="py-10 text-center text-sm text-fmuted">{t("Ops.attentionEmpty")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-fline">
              {attention.map((r) => {
                const overdue = r.resolutionDueAt && r.resolutionDueAt < now;
                return (
                  <li key={r.id}>
                    <Link href={`/facility/ops/requests/${r.reference}`} className="flex flex-wrap items-center gap-3 rounded-xl px-2 py-3 hover:bg-lav-50">
                      <span className="font-mono text-sm font-semibold text-deep" dir="ltr">{r.reference}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-fink">{r.issue ? pickName(r.issue, locale) : r.issueOther} · {r.floor?.code ?? "—"}</span>
                      <PriorityChip priority={r.priority} label={t(`Priority.${r.priority}`)} />
                      {overdue && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{t("Ops.table.overdue")}</span>}
                      {!r.teamId && <span className="rounded-full bg-lav-100 px-2 py-0.5 text-xs font-bold text-deep">{t("Ops.table.unassigned")}</span>}
                      {r.escalationLevel > 0 && <span className="rounded-full bg-[#FFF3E6] px-2 py-0.5 text-xs font-bold text-[#9A4300]">{t("Ops.detail.escalated", { n: r.escalationLevel })}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className={`${fhCard} p-5`}>
          <h2 className="font-extrabold text-fink">{t("Ops.byStatus")}</h2>
          <div className="mt-5">
            <BarList
              empty={t("Ops.analytics.noData")}
              items={OPEN_STATUSES.map((s) => ({ key: s, label: t(`Status.${s}`), value: openByStatus.find((x) => x.status === s)?._count ?? 0 })).filter((i) => i.value > 0)}
            />
          </div>
          <h2 className="mt-8 font-extrabold text-fink">{t("Ops.byFloor")}</h2>
          <div className="mt-5">
            <BarList
              empty={t("Ops.analytics.noData")}
              items={floors
                .map((f) => ({ key: f.floorId ?? "none", label: f.floorId ? floorRows.find((x) => x.id === f.floorId)?.code ?? "?" : t("Common.other"), value: f._count }))
                .sort((a, b) => b.value - a.value)}
            />
          </div>
        </section>
      </div>

      <section className={`${fhCard} mt-6 p-5`}>
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-fink">{t("Ops.latest")}</h2>
          <Link href="/facility/ops/requests" className="inline-flex items-center gap-1 text-sm font-semibold text-deep hover:underline">{t("Ops.viewAll")} <ArrowUpRight className="size-4" /></Link>
        </div>
        {latest.length === 0 ? (
          <div className="py-10 text-center text-sm text-fmuted"><Inbox className="mx-auto mb-2 size-6" />{t("Requests.empty")}</div>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {latest.map((r) => (
              <li key={r.id}>
                <Link href={`/facility/ops/requests/${r.reference}`} className="block rounded-2xl border border-fline p-4 transition hover:border-lav-200 hover:bg-lav-50/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-deep" dir="ltr">{r.reference}</span>
                    <StatusChip status={r.status} label={t(`Status.${r.status}`)} />
                  </div>
                  <p className="mt-2 truncate font-semibold text-fink">{r.issue ? pickName(r.issue, locale) : r.issueOther}</p>
                  <p className="truncate text-xs text-fmuted">{r.employeeName} · {relativeTime(r.createdAt, locale)} · {formatDate(r.createdAt, locale)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
