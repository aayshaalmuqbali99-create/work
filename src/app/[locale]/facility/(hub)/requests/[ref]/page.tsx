import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireFacPage } from "@/features/facility/server/guard";
import { getRequestForUser } from "@/features/facility/server/queries";
import { getSettings } from "@/features/facility/server/calendar";
import { employeeCanCancel, employeeCanConfirm, employeeCanReopen, MILESTONES } from "@/features/facility/domain/status";
import { REFERENCE_RE } from "@/features/facility/domain/reference";
import { formatDate, pickName } from "@/features/facility/format";
import { exactLocationParts } from "@/features/facility/location-text";
import { Timeline } from "@/components/facility/timeline";
import { PhotoGrid } from "@/components/facility/photo-grid";
import { RequestActions } from "@/components/facility/request-actions";
import { PriorityChip, StatusChip } from "@/components/facility/ui";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }) {
  return { title: (await params).ref };
}

export default async function RequestDetailPage({ params }: { params: Promise<{ locale: string; ref: string }> }) {
  const { locale, ref } = await params;
  setRequestLocale(locale);
  const user = await requireFacPage(undefined, `/facility/requests/${ref}`);
  if (!REFERENCE_RE.test(ref)) notFound();
  const r = await getRequestForUser(user, ref, true);
  if (!r) notFound();
  const [t, settings] = await Promise.all([getTranslations("Fac"), getSettings()]);
  const Back = locale === "ar" ? ArrowRight : ArrowLeft;
  const reached = new Set(r.events.filter((e) => e.status).map((e) => e.status));
  const currentIdx = MILESTONES.indexOf(r.status);
  const report = r.attachments.filter((a) => a.kind === "REPORT");
  const completion = r.attachments.filter((a) => a.kind === "COMPLETION");

  return (
    <div className="bg-[linear-gradient(180deg,#F6F5FF_0,#ffffff_420px)] px-5 pb-10 pt-32 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/facility/requests" className="inline-flex items-center gap-2 text-sm font-semibold text-deep hover:underline">
          <Back className="size-4" aria-hidden="true" /> {t("Detail.back")}
        </Link>
        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-lg font-bold text-deep" dir="ltr">{r.reference}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-fink sm:text-4xl">{r.issue ? pickName(r.issue, locale) : r.issueOther}</h1>
            <p className="mt-2 text-fmuted">{locale === "ar" ? r.locationLabelAr : r.locationLabelEn}</p>
          </div>
          <div className="flex items-center gap-2">
            <PriorityChip priority={r.priority} label={t(`Priority.${r.priority}`)} />
            <StatusChip status={r.status} label={t(`Status.${r.status}`)} className="px-4 py-1.5 text-sm" />
          </div>
        </header>

        {/* milestone progress */}
        {!["CANCELLED", "REJECTED"].includes(r.status) && (
          <ol className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label={t("Detail.timeline")}>
            {MILESTONES.map((m, i) => {
              const done = reached.has(m) && (currentIdx === -1 ? true : i <= currentIdx);
              const current = m === r.status;
              return (
                <li key={m} className="flex flex-col gap-2">
                  <span className={cn("h-1.5 rounded-full", done ? "bg-deep" : current ? "bg-gold" : "bg-lav-100")} />
                  <span className={cn("text-xs font-semibold", done || current ? "text-fink" : "text-fmuted/70")}>{t(`Status.${m}`)}</span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-8">
            <section className="rounded-[28px] border border-fline bg-white p-6 shadow-soft">
              <h2 className="text-lg font-extrabold text-fink">{t("Detail.details")}</h2>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-fink">{r.description}</p>
              <dl className="mt-6 grid gap-4 border-t border-fline pt-5 sm:grid-cols-2">
                <Info label={t("Detail.category")}>{r.category ? pickName(r.category, locale) : t("Common.other")} · {t(`Service.${r.service}`)}</Info>
                <Info label={t("Detail.submitted")}>{formatDate(r.createdAt, locale, true)}</Info>
                <Info label={t("Detail.team")}>{r.team ? pickName(r.team, locale) : "—"}</Info>
                <Info label={t("Detail.building")}>{r.building ? pickName(r.building, locale) : "—"}</Info>
                <Info label={t("Detail.floor")}>{r.floor ? `${r.floor.code} · ${pickName(r.floor, locale)}` : t("Wizard.notListedFloor")}</Info>
                {r.wing && <Info label={t("Detail.wing")}>{pickName(r.wing, locale)}</Info>}
                <Info label={t("Detail.area")}>{r.area ? pickName(r.area, locale) : "—"}</Info>
                <Info label={t("Detail.exactLocation")} wide>{exactLocationParts(r, locale, (k) => t(k as "Fields.room")).join(" · ") || "—"}</Info>
              </dl>
            </section>
            {report.length > 0 && (
              <section className="rounded-[28px] border border-fline bg-white p-6 shadow-soft">
                <h2 className="mb-4 text-lg font-extrabold text-fink">{t("Detail.photos")}</h2>
                <PhotoGrid photos={report} />
              </section>
            )}
            {completion.length > 0 && (
              <section className="rounded-[28px] border border-fline bg-white p-6 shadow-soft">
                <h2 className="mb-4 text-lg font-extrabold text-fink">{t("Detail.completionPhotos")}</h2>
                <PhotoGrid photos={completion} />
              </section>
            )}
            <section className="rounded-[28px] border border-fline bg-white p-6 shadow-soft">
              <h2 className="mb-6 text-lg font-extrabold text-fink">{t("Detail.timeline")}</h2>
              <Timeline events={r.events} />
            </section>
          </div>
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <RequestActions
              reference={r.reference}
              canConfirm={employeeCanConfirm(r.status)}
              canReopen={employeeCanReopen(r.status, r.resolvedAt, settings.reopenDays)}
              canCancel={employeeCanCancel(r.status)}
              canFeedback={["RESOLVED", "CLOSED"].includes(r.status) && !r.rating}
              reopenDays={settings.reopenDays}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

function Info({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-bold uppercase tracking-wider text-fmuted">{label}</dt>
      <dd className="mt-1 font-medium text-fink">{children}</dd>
    </div>
  );
}
