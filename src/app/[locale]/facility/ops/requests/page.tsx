import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PriorityChip, SampleTag, StatusChip } from "@/components/facility/ui";
import { RequestFilterBar } from "@/components/facility/ops/request-filters";
import { AllCheck, BulkProvider, RowCheck } from "@/components/facility/ops/bulk-assign";
import { requireFacPage } from "@/features/facility/server/guard";
import { filtersToWhere, type RequestFilters } from "@/features/facility/server/filters";
import { STATUSES, FINISHED } from "@/features/facility/domain/status";
import { can } from "@/features/facility/domain/permissions";
import { formatDate, pickName, relativeTime } from "@/features/facility/format";
import { exactLocationParts } from "@/features/facility/location-text";

const PAGE = 25;

export default async function OpsRequestsPage({ searchParams }: { searchParams: Promise<RequestFilters> }) {
  const user = await requireFacPage("ops.view");
  const sp = await searchParams;
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const where = filtersToWhere(user, sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const [count, rows, floors, teams, categories, wings, areaCats] = await Promise.all([
    db.facRequest.count({ where }),
    db.facRequest.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { category: true, issue: true, building: true, floor: true, wing: true, area: true, location: true, team: true } }),
    db.facFloor.findMany({ orderBy: { sortOrder: "asc" } }),
    db.facTeam.findMany({ orderBy: { nameEn: "asc" } }),
    db.facCategory.findMany({ orderBy: [{ service: "asc" }, { sortOrder: "asc" }] }),
    db.facWing.findMany({ orderBy: { sortOrder: "asc" } }),
    db.facAreaCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const now = new Date();
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]);
  const pages = Math.max(1, Math.ceil(count / PAGE));
  const assignable = teams.filter((x) => x.active && (x.kind === "INTERNAL" || x.scopeConfirmed)).map((x) => ({ id: x.id, label: pickName(x, locale) }));
  const bulk = can(user.role, "ops.assign");
  const pageHref = (p: number) => `/facility/ops/requests?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(p) })}`;

  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="text-3xl font-extrabold tracking-tight text-fink">{t("Ops.nav.requests")}</h1>
      <div className="mt-5">
        <RequestFilterBar
          exportHref={`/api/facility/ops/export?${qs.toString()}`}
          options={{
            status: STATUSES.map((s) => ({ value: s, label: t(`Status.${s}`) })),
            service: (["MAINTENANCE", "CLEANING"] as const).map((s) => ({ value: s, label: t(`Service.${s}`) })),
            priority: (["LOW", "MEDIUM", "HIGH", "EMERGENCY"] as const).map((s) => ({ value: s, label: t(`Priority.${s}`) })),
            floor: [...floors.map((f) => ({ value: f.id, label: `${f.code} · ${pickName(f, locale)}` })), { value: "none", label: t("Wizard.notListedFloor") }],
            wing: [...wings.map((w) => ({ value: w.id, label: pickName(w, locale) })), { value: "none", label: t("Ops.analytics.noWing") }],
            area: areaCats.map((a) => ({ value: `kind:${a.key}`, label: pickName(a, locale) })),
            team: [...teams.map((x) => ({ value: x.id, label: pickName(x, locale) })), { value: "none", label: t("Ops.table.unassigned") }],
            category: categories.map((c) => ({ value: c.id, label: `${t(`Service.${c.service}`)} · ${pickName(c, locale)}` })),
          }}
        />
      </div>
      <p className="mt-4 text-sm text-fmuted" aria-live="polite">{t("Ops.filters.results", { count })}</p>

      <BulkProvider teams={assignable} enabled={bulk}>
        <div className="mt-3 overflow-x-auto rounded-[22px] border border-fline bg-white">
          <table className="w-full min-w-[1350px] text-sm">
            <thead className="bg-lav-50/70 text-start text-xs font-bold uppercase tracking-wide text-fmuted">
              <tr>
                {bulk && <th className="w-10 px-4 py-3"><AllCheck ids={rows.map((r) => r.id)} label={t("Common.all")} /></th>}
                {(["reference", "employee", "service", "category", "floor", "wing", "area", "location", "priority", "team", "status", "submitted", "sla"] as const).map((h) => (
                  <th key={h} scope="col" className="whitespace-nowrap px-3 py-3 text-start">{t(`Ops.table.${h}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-fline">
              {rows.length === 0 && (
                <tr><td colSpan={14} className="px-4 py-14 text-center text-fmuted">{t("Requests.noMatch")}</td></tr>
              )}
              {rows.map((r) => {
                const overdue = !FINISHED.has(r.status) && r.resolutionDueAt && r.resolutionDueAt < now;
                return (
                  <tr key={r.id} className="transition hover:bg-lav-50/50">
                    {bulk && <td className="px-4 py-3"><RowCheck id={r.id} label={r.reference} /></td>}
                    <td className="whitespace-nowrap px-3 py-3">
                      <Link href={`/facility/ops/requests/${r.reference}`} className="font-mono font-semibold text-deep hover:underline" dir="ltr">{r.reference}</Link>
                      {r.isSample && <span className="ms-2"><SampleTag label={t("Common.sample")} /></span>}
                    </td>
                    <td className="max-w-40 px-3 py-3"><span className="block truncate">{r.employeeName}</span>{r.employeeNo && <span className="block truncate font-mono text-xs text-fmuted" dir="ltr">{r.employeeNo}</span>}</td>
                    <td className="px-3 py-3">{t(`Service.${r.service}`)}</td>
                    <td className="max-w-48 px-3 py-3">
                      <span className="block truncate font-medium">{r.issue ? pickName(r.issue, locale) : r.issueOther}</span>
                      <span className="block truncate text-xs text-fmuted">{pickName(r.category, locale)}</span>
                    </td>
                    <td className="px-3 py-3 font-mono" dir="ltr" title={r.building ? pickName(r.building, locale) : undefined}>{r.floor?.code ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3">{r.wing ? pickName(r.wing, locale) : "—"}</td>
                    <td className="max-w-36 truncate px-3 py-3">{r.area ? pickName(r.area, locale) : "—"}</td>
                    <td className="max-w-44 truncate px-3 py-3 text-xs text-fmuted" title={exactLocationParts(r, locale, (k) => t(k as "Fields.room")).join(" · ")}>{exactLocationParts(r, locale, (k) => t(k as "Fields.room")).join(" · ") || "—"}</td>
                    <td className="px-3 py-3"><PriorityChip priority={r.priority} label={t(`Priority.${r.priority}`)} /></td>
                    <td className="max-w-40 truncate px-3 py-3">
                      {r.team ? <>{pickName(r.team, locale)}{r.team.kind === "CONTRACTOR" && <span className="block text-xs text-fmuted">{t("Ops.table.contractor")}</span>}</> : <span className="text-fmuted">{t("Ops.table.unassigned")}</span>}
                    </td>
                    <td className="px-3 py-3"><StatusChip status={r.status} label={t(`Status.${r.status}`)} /></td>
                    <td className="whitespace-nowrap px-3 py-3 text-fmuted">{formatDate(r.createdAt, locale)}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {FINISHED.has(r.status) ? "—" : !r.resolutionDueAt ? <span className="text-fmuted">{t("Ops.table.noSla")}</span> : (
                        <span className={cn("font-semibold", overdue ? "text-red-700" : "text-fink")}>{overdue ? `${t("Ops.table.overdue")} · ` : ""}{relativeTime(r.resolutionDueAt, locale)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </BulkProvider>

      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-center gap-2" aria-label="pagination">
          {page > 1 && <Link href={pageHref(page - 1)} className="grid size-10 place-items-center rounded-full border border-fline bg-white hover:bg-lav-50" aria-label="←"><ChevronLeft className="size-4 rtl:rotate-180" /></Link>}
          <span className="px-3 text-sm font-semibold" dir="ltr">{page} / {pages}</span>
          {page < pages && <Link href={pageHref(page + 1)} className="grid size-10 place-items-center rounded-full border border-fline bg-white hover:bg-lav-50" aria-label="→"><ChevronRight className="size-4 rtl:rotate-180" /></Link>}
        </nav>
      )}
    </div>
  );
}
