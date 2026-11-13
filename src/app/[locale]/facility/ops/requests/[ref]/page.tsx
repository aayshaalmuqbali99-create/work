import { notFound } from "next/navigation";
import { isGuestEmail } from "@/features/facility/server/notify";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, AlertTriangle, Mail, Phone, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { requireFacPage } from "@/features/facility/server/guard";
import { getRequestForUser } from "@/features/facility/server/queries";
import { findRoute } from "@/features/facility/server/requests";
import { TRANSITIONS, canTransition } from "@/features/facility/domain/status";
import { REFERENCE_RE } from "@/features/facility/domain/reference";
import { can } from "@/features/facility/domain/permissions";
import { formatDate, pickName, relativeTime } from "@/features/facility/format";
import { exactLocationParts } from "@/features/facility/location-text";
import { Timeline } from "@/components/facility/timeline";
import { PhotoGrid } from "@/components/facility/photo-grid";
import { ManagePanel } from "@/components/facility/ops/manage-panel";
import { PriorityChip, SampleTag, StatusChip, fhCard } from "@/components/facility/ui";

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }) {
  return { title: (await params).ref };
}

export default async function OpsRequestPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const user = await requireFacPage("ops.view");
  if (!REFERENCE_RE.test(ref)) notFound();
  const r = await getRequestForUser(user, ref);
  if (!r) notFound();
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const teams = await db.facTeam.findMany({ where: { active: true }, orderBy: { nameEn: "asc" } });
  const route = await findRoute(db, { service: r.service, categoryId: r.categoryId, floorCode: r.floor?.code ?? null, areaKind: r.area?.kind ?? null });
  const Back = locale === "ar" ? ArrowRight : ArrowLeft;
  const now = new Date();
  const slaRow = (label: string, due: Date | null, doneAt: Date | null) => {
    if (!due) return <Row label={label}><span className="text-fmuted">{t("Ops.table.noSla")}</span></Row>;
    const met = doneAt ? doneAt <= due : null;
    const late = !doneAt && due < now;
    return (
      <Row label={label}>
        <span className={cn("font-semibold", late || met === false ? "text-red-700" : met ? "text-[#1B6B3E]" : "text-fink")}>
          {formatDate(due, locale, true)} · {met === null ? (late ? t("Ops.table.overdue") : relativeTime(due, locale)) : met ? t("Ops.detail.met") : t("Ops.detail.missed")}
        </span>
      </Row>
    );
  };

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/facility/ops/requests" className="inline-flex items-center gap-2 text-sm font-semibold text-deep hover:underline"><Back className="size-4" /> {t("Ops.nav.requests")}</Link>
      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-lg font-bold text-deep" dir="ltr">{r.reference} {r.isSample && <SampleTag label={t("Common.sample")} />}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-fink">{r.issue ? pickName(r.issue, locale) : r.issueOther}</h1>
          <p className="mt-1 text-fmuted">{locale === "ar" ? r.locationLabelAr : r.locationLabelEn}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {r.escalationLevel > 0 && <span className="rounded-full bg-[#FFF3E6] px-3 py-1 text-xs font-bold text-[#9A4300]">{t("Ops.detail.escalated", { n: r.escalationLevel })}</span>}
          <PriorityChip priority={r.priority} label={t(`Priority.${r.priority}`)} />
          <StatusChip status={r.status} label={t(`Status.${r.status}`)} className="px-4 py-1.5 text-sm" />
        </div>
      </header>
      {r.safetyFlag && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"><AlertTriangle className="size-4" /> {t("Safety.title")}</p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className={`${fhCard} p-6`}>
            <p className="whitespace-pre-line leading-relaxed text-fink">{r.description}</p>
            <dl className="mt-6 grid gap-x-6 gap-y-3 border-t border-fline pt-5 sm:grid-cols-2">
              <Row label={t("Ops.table.service")}>{t(`Service.${r.service}`)}</Row>
              <Row label={t("Detail.category")}>{r.category ? pickName(r.category, locale) : t("Common.other")}</Row>
              <Row label={t("Ops.table.building")}>{r.building ? pickName(r.building, locale) : "—"}</Row>
              <Row label={t("Ops.table.floor")}>{r.floor ? `${r.floor.code} · ${pickName(r.floor, locale)}` : t("Wizard.notListedFloor")}</Row>
              <Row label={t("Ops.table.wing")}>{r.wing ? pickName(r.wing, locale) : "—"}</Row>
              <Row label={t("Ops.table.area")}>{r.area ? pickName(r.area, locale) : "—"}</Row>
              <Row label={t("Ops.table.location")} wide>{exactLocationParts(r, locale, (k) => t(k as "Fields.room")).join(" · ") || "—"}</Row>
              <Row label={t("Detail.submitted")}>{formatDate(r.createdAt, locale, true)}</Row>
              <Row label={t("Ops.table.team")}>{r.team ? pickName(r.team, locale) : t("Ops.table.unassigned")}</Row>
            </dl>
          </section>
          <section className={`${fhCard} p-6`}>
            <h2 className="font-extrabold text-fink">{t("Ops.detail.employee")}</h2>
            <p className="mt-2 text-lg font-bold text-fink">{r.employeeName}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-lav-50 px-3 py-2">
                <dt className="text-xs font-semibold text-fmuted">{t("Requester.employeeNo")}</dt>
                <dd className="mt-0.5 font-mono font-bold text-fink" dir="ltr">{r.employeeNo || "—"}</dd>
              </div>
              <div className="rounded-2xl bg-lav-50 px-3 py-2">
                <dt className="text-xs font-semibold text-fmuted">{t("Requester.unit")}</dt>
                <dd className="mt-0.5 font-bold text-fink">{r.department || "—"}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {!isGuestEmail(r.employeeEmail) && <a href={`mailto:${r.employeeEmail}`} className="inline-flex items-center gap-1.5 text-deep hover:underline" dir="ltr"><Mail className="size-4" /> {r.employeeEmail}</a>}
              {r.contactPhone && <a href={`tel:${r.contactPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-deep hover:underline" dir="ltr"><Phone className="size-4" /> {r.contactPhone}</a>}
            </div>
            {r.rating && (
              <p className="mt-4 flex items-center gap-1 text-sm">{t("Ops.detail.rating")}: {Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn("size-4", i < r.rating! ? "fill-gold text-gold" : "text-lav-200")} />)} {r.feedback && <span className="ms-2 text-fmuted">“{r.feedback}”</span>}</p>
            )}
          </section>
          <section className={`${fhCard} p-6`}>
            <h2 className="font-extrabold text-fink">{t("Ops.detail.sla")}</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {slaRow(t("Ops.detail.response"), r.responseDueAt, r.firstResponseAt)}
              {slaRow(t("Ops.detail.resolution"), r.resolutionDueAt, r.resolvedAt)}
            </dl>
          </section>
          {r.attachments.some((a) => a.kind === "REPORT") && (
            <section className={`${fhCard} p-6`}><h2 className="mb-4 font-extrabold text-fink">{t("Detail.photos")}</h2><PhotoGrid photos={r.attachments.filter((a) => a.kind === "REPORT")} /></section>
          )}
          {r.attachments.some((a) => a.kind === "COMPLETION") && (
            <section className={`${fhCard} p-6`}><h2 className="mb-4 font-extrabold text-fink">{t("Detail.completionPhotos")}</h2><PhotoGrid photos={r.attachments.filter((a) => a.kind === "COMPLETION")} /></section>
          )}
          <section className={`${fhCard} p-6`}>
            <h2 className="mb-6 font-extrabold text-fink">{t("Detail.timeline")}</h2>
            <Timeline events={r.events} showInternal />
          </section>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ManagePanel
            id={r.id}
            status={r.status}
            priority={r.priority}
            teamId={r.teamId}
            targets={TRANSITIONS[r.status].filter((s) => canTransition(user.role, r.status, s))}
            teams={teams.map((x) => ({ id: x.id, label: pickName(x, locale), disabled: x.kind === "CONTRACTOR" && !x.scopeConfirmed, note: x.kind === "CONTRACTOR" && !x.scopeConfirmed ? t("Ops.detail.unconfirmedScope") : undefined }))}
            suggested={route ? pickName(route.team, locale) : null}
            can={{ assign: can(user.role, "ops.assign"), manage: can(user.role, "ops.manageAll") }}
          />
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-bold uppercase tracking-wider text-fmuted">{label}</dt>
      <dd className="mt-0.5 text-sm text-fink">{children}</dd>
    </div>
  );
}
