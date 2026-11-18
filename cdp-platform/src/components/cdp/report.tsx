"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { QUESTIONS, TABS, THEMES } from "@/features/cdp/config";
import type { DashboardView } from "@/features/cdp/data";
import { QuestionCard } from "./question-card";
import { useFormat } from "./shared";

const EXAMPLES = 4;

export function CdpReport({ view, dept, generated }: { view: DashboardView; dept: number | null; generated: string }) {
  const t = useTranslations("Cdp");
  const tb = useTranslations("Brand");
  const locale = useLocale();
  const f = useFormat();
  const counts = view.counts[dept === null ? "all" : String(dept)] ?? {};
  const inView = dept === null ? view.meta.total : view.departments[dept].count;
  const deptName = dept === null ? t("allDepartments") : view.departments[dept].name;

  useEffect(() => {
    const id = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <main id="main" className="cdp-report mx-auto w-full max-w-5xl flex-1 bg-surface px-6 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex justify-end print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white">
          <Printer className="size-4" aria-hidden="true" />
          {t("printNow")}
        </button>
      </div>

      <header className="border-b-4 border-teal pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy" lang="en" dir="ltr">Omantel | CDP Programme Evaluation 2026</p>
        <h1 className="mt-1 text-2xl font-bold text-navy">{t("reportTitle")}</h1>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4" data-testid="report-meta">
          <div><dt className="text-muted">{t("filterLabel")}</dt><dd className="font-semibold text-ink">{deptName}</dd></div>
          <div><dt className="text-muted">{t("inView")}</dt><dd className="font-semibold tabular-nums text-ink">{f.int(inView)} / {f.int(view.meta.total)}</dd></div>
          <div><dt className="text-muted">{t("dataUpdated")}</dt><dd className="font-semibold text-ink">{f.date(view.meta.activatedAt)}</dd></div>
          <div><dt className="text-muted">{t("sourceFile")}</dt><dd className="break-all font-semibold text-ink" dir="ltr">{view.meta.fileName}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-muted">{t("reportPrivacy")} · {t("generatedAt", { date: f.date(generated) })}</p>
        <p className="mt-1 text-xs font-bold text-navy" lang="en" dir="ltr">{tb("omantelTagline")}</p>
      </header>

      <section className="mt-6 break-inside-avoid">
        <h2 className="text-lg font-bold text-navy">{t("totalTitle")}: <span className="tabular-nums">{f.int(view.meta.total)}</span></h2>
        <h3 className="mt-4 font-semibold text-navy">{t("deptTitle")}</h3>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {view.departments.map((d, i) => (
              <tr key={i} className="border-b border-line">
                <td className="py-1.5" dir="auto">{d.name}</td>
                <td className="w-1/3 py-1.5"><span className="block h-3 rounded bg-navy [print-color-adjust:exact]" style={{ width: `${(d.count / view.meta.total) * 100}%` }} /></td>
                <td className="py-1.5 text-end tabular-nums">{f.int(d.count)} ({f.pct(d.count, view.meta.total)})</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {TABS.map((tb) => (
        <section key={tb.id} className="mt-8 print:break-before-page">
          <h2 className="mb-3 border-b border-line pb-2 text-xl font-bold text-navy">{locale === "ar" ? tb.ar : tb.en}</h2>
          <div className="space-y-3">
            {QUESTIONS.filter((q) => q.tab === tb.id && ["satisfaction", "rating", "challenge"].includes(q.kind)).map((q) => (
              <QuestionCard key={q.id} q={q} header={view.questions[q.id]?.header ?? null} counts={counts[q.id]} missing={view.missing.includes(q.id)} highlight={q.kind === "satisfaction"} />
            ))}
            {QUESTIONS.filter((q) => q.tab === tb.id && q.kind === "text").map((q) => {
              const list = view.comments.filter((c) => c.q === q.id && (dept === null || c.d === dept));
              const themeCounts = THEMES.map((th) => ({ th, n: list.filter((c) => c.themes.includes(th.id)).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
              return (
                <article key={q.id} className="break-inside-avoid rounded-card border border-line p-4">
                  {q.thanks && q.id === QUESTIONS.find((x) => x.thanks && x.kind === "thanks")?.id && (
                    <p className="mb-2 text-sm font-semibold text-amber-700">{t("thanksTitle")} — {t("thanksNote")}</p>
                  )}
                  <h3 className="whitespace-pre-line font-semibold text-navy" dir="auto">{view.questions[q.id]?.header?.trim() || (locale === "ar" ? q.ar : q.en)}</h3>
                  <p className="mt-1 text-sm text-muted">{f.int(list.length)} {t("commentsCount")}</p>
                  {themeCounts.length > 0 && (
                    <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                      {themeCounts.map(({ th, n }) => (
                        <li key={th.id} className="flex justify-between gap-2 border-b border-line/60 py-0.5"><span>{locale === "ar" ? th.ar : th.en}</span><span className="tabular-nums">{f.int(n)} ({f.pct(n, list.length)})</span></li>
                      ))}
                    </ul>
                  )}
                  {list.length > 0 && (
                    <>
                      <p className="mt-3 text-xs font-semibold text-muted">{t("examples")}</p>
                      <ul className="mt-1 list-disc space-y-1 ps-5 text-sm">
                        {list.slice(0, EXAMPLES).map((c) => <li key={c.id} dir="auto">{c.text}</li>)}
                      </ul>
                    </>
                  )}
                </article>
              );
            })}
            {tb.id === "huawei" && (
              <article className="break-inside-avoid rounded-card border border-amber-200 p-4 text-sm">
                <h3 className="font-semibold text-navy">{t("thanksTitle")}</h3>
                <p className="text-muted">{t("thanksNote")}</p>
                <p className="mt-2">{t("peopleSummary", { people: f.int(view.peopleSummary.people), repeated: f.int(view.peopleSummary.repeated) })}</p>
                <ul className="mt-1 text-muted">
                  {QUESTIONS.filter((q) => q.thanks).map((q) => (
                    <li key={q.id}>{q.id}: {locale === "ar" ? q.ar : q.en} — {f.int(view.thanksCounts[q.id] ?? 0)}</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted">{t("peopleRestricted")}</p>
              </article>
            )}
          </div>
        </section>
      ))}
    </main>
  );
}
