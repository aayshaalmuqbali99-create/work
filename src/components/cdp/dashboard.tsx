"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Award, FileDown, Heart, Filter, Lock, MonitorPlay, RotateCcw, Users, X } from "lucide-react";
import { QUESTIONS, SATISFACTION_QUESTIONS, TABS, type TabId } from "@/features/cdp/config";
import type { DashboardView } from "@/features/cdp/data";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { CommentsBlock } from "./comments";
import { PeopleRecognition } from "./people";
import { QuestionCard } from "./question-card";
import { ChoiceRows, StackedBar, useFormat, valid } from "./shared";

type Props = { view: DashboardView; isAdmin: boolean; initial: { dept: number | null; tab: TabId; present: boolean }; adminBar: React.ReactNode };

export function CdpDashboard({ view, initial, adminBar }: Props) {
  const t = useTranslations("Cdp");
  const locale = useLocale();
  const f = useFormat();
  const [dept, setDept] = useState<number | null>(initial.dept !== null && view.departments[initial.dept]?.selectable ? initial.dept : null);
  const [tab, setTab] = useState<TabId>(initial.tab);
  const [present, setPresent] = useState(initial.present);

  // Keep the view in the address so it can be shared or reopened in the meeting.
  useEffect(() => {
    const url = new URL(window.location.href);
    const set = (k: string, v: string | null) => (v === null ? url.searchParams.delete(k) : url.searchParams.set(k, v));
    set("dept", dept === null ? null : String(dept));
    set("tab", tab === "general" ? null : tab);
    set("present", present ? "1" : null);
    window.history.replaceState(null, "", url);
    document.documentElement.dataset.present = present ? "on" : "off";
  }, [dept, tab, present]);

  const counts = view.counts[dept === null ? "all" : String(dept)] ?? {};
  const inView = dept === null ? view.meta.total : (view.departments[dept]?.count ?? 0);
  const deptName = dept === null ? t("allDepartments") : view.departments[dept].name;
  const tabLabel = (id: TabId) => {
    const x = TABS.find((tb) => tb.id === id)!;
    return locale === "ar" ? x.ar : x.en;
  };
  const choose = useCallback((i: number | null) => setDept((cur) => (cur === i ? null : i)), []);
  const openTab = (id: TabId) => {
    setTab(id);
    document.getElementById("cdp-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const reportHref = `/${locale}/cdp/report${dept === null ? "" : `?dept=${dept}`}`;
  const maxDept = Math.max(...view.departments.map((d) => d.count), 1);

  return (
    <div className={cn("space-y-6 sm:space-y-8", present && "cdp-present")}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setPresent((v) => !v)}
          aria-pressed={present}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
            present ? "border-navy bg-navy text-white" : "border-line bg-surface text-navy hover:border-teal",
          )}
        >
          {present ? <X className="size-4" aria-hidden="true" /> : <MonitorPlay className="size-4" aria-hidden="true" />}
          {present ? t("exitPresent") : t("present")}
        </button>
        <a href={reportHref} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-navy hover:border-teal">
          <FileDown className="size-4" aria-hidden="true" />
          {t("exportPdf")}
        </a>
        {view.thanksBoard && (
          <Link href="/cdp/thanks" className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-navy hover:border-amber-500">
            <Heart className="size-4 text-amber-600" aria-hidden="true" />
            {t("boardTitle")}
          </Link>
        )}
        {!present && adminBar}
      </div>

      {view.missing.length > 0 && !present && (
        <p role="alert" className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("missingSummary", { list: view.missing.join(", ") })}
        </p>
      )}

      {/* 1. Total responses */}
      <section aria-labelledby="total-title" className="relative overflow-hidden rounded-card bg-navy px-6 py-7 text-white sm:px-10 sm:py-9">
        <div className="absolute -end-10 -top-16 size-56 rounded-full bg-teal/30 blur-2xl" aria-hidden="true" />
        <h2 id="total-title" className="relative text-base font-medium text-white/80 sm:text-lg">
          {t("totalTitle")}
          <span className="block text-sm text-white/60 sm:ms-2 sm:inline" lang={locale === "ar" ? "en" : "ar"}><span className="hidden sm:inline">| </span>{t("totalTitleOther")}</span>
        </h2>
        <p className="relative mt-1 text-6xl font-bold tabular-nums tracking-tight sm:text-8xl" data-testid="total-responses">{f.int(view.meta.total)}</p>
        <p className="relative mt-2 text-sm text-white/70">{t("totalNote")}</p>
      </section>

      {/* 2. Departments */}
      <section aria-labelledby="dept-title" className="rounded-card border border-line bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="dept-title" className="flex items-center gap-2 text-lg font-bold text-navy sm:text-xl">
              <Users className="size-5 text-teal" aria-hidden="true" />
              {t("deptTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("deptNote")}</p>
          </div>
        </div>
        <ul className="mt-5 space-y-2.5" data-testid="dept-chart">
          {view.departments.map((d, i) => {
            const active = dept === i;
            return (
              <li key={d.name + i}>
                <button
                  type="button"
                  onClick={() => d.selectable && choose(i)}
                  disabled={!d.selectable}
                  aria-pressed={active}
                  title={d.selectable ? t("clickToFilter") : t("smallDept", { n: view.minGroup })}
                  className={cn(
                    "group grid w-full grid-cols-1 gap-1.5 rounded-xl px-3 py-2.5 text-start transition sm:grid-cols-[minmax(0,16rem)_1fr_auto] sm:items-center sm:gap-4",
                    active ? "bg-teal-light ring-2 ring-teal" : d.selectable ? "hover:bg-canvas" : "cursor-not-allowed",
                  )}
                >
                  <span className="flex items-center gap-1.5 font-medium text-ink" dir="auto">
                    {d.name}
                    {!d.selectable && <Lock className="size-3.5 text-muted" aria-label={t("smallDept", { n: view.minGroup })} />}
                  </span>
                  <span className="h-5 overflow-hidden rounded-md bg-canvas" aria-hidden="true">
                    <span
                      className={cn("block h-full rounded-md transition-all print:[print-color-adjust:exact]", active ? "bg-teal" : "bg-navy/80 group-hover:bg-teal")}
                      style={{ width: `${(d.count / maxDept) * 100}%` }}
                    />
                  </span>
                  <span className="text-sm tabular-nums text-ink sm:text-end">
                    <strong className="text-base">{f.int(d.count)}</strong> <span className="text-muted">({f.pct(d.count, view.meta.total)})</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {view.departments.some((d) => !d.selectable) && <p className="mt-3 text-xs text-muted">{t("smallDeptNote", { n: view.minGroup })}</p>}
      </section>

      {/* Filter bar */}
      <div className="sticky top-0 z-20 -mx-4 border-y border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border print:static print:border-0">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="dept-filter" className="flex items-center gap-2 text-sm font-semibold text-navy">
            <Filter className="size-4" aria-hidden="true" />
            {t("filterLabel")}
          </label>
          <select
            id="dept-filter"
            value={dept === null ? "" : String(dept)}
            onChange={(e) => setDept(e.target.value === "" ? null : Number(e.target.value))}
            className="min-w-0 max-w-full flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm sm:flex-none"
          >
            <option value="">{t("allDepartments")}</option>
            {view.departments.map((d, i) => (
              <option key={i} value={i} disabled={!d.selectable}>
                {d.name} ({f.int(d.count)}){d.selectable ? "" : ` — ${t("smallDeptShort")}`}
              </option>
            ))}
          </select>
          <p className="text-sm text-ink" data-testid="in-view">
            {t("inView")} <strong className="tabular-nums">{f.int(inView)}</strong>
            {dept !== null && <span className="text-muted"> / {f.int(view.meta.total)}</span>}
          </p>
          {dept !== null && (
            <button type="button" onClick={() => setDept(null)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-teal hover:bg-surface">
              <RotateCcw className="size-4" aria-hidden="true" />
              {t("resetFilter")}
            </button>
          )}
        </div>
      </div>

      {/* Satisfaction headlines */}
      <section aria-labelledby="sat-title">
        <h2 id="sat-title" className="mb-3 text-lg font-bold text-navy sm:text-xl">{t("satisfactionTitle", { dept: deptName })}</h2>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {SATISFACTION_QUESTIONS.map((q) => {
            const c = counts[q.id];
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => openTab(q.tab)}
                data-testid={`sat-${q.id}`}
                className={cn("rounded-card border bg-surface p-5 text-start transition hover:border-teal hover:shadow-md", tab === q.tab ? "border-teal/50" : "border-line")}
              >
                <p className="text-sm font-semibold text-teal">{tabLabel(q.tab)}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{locale === "ar" ? q.ar : q.en}</p>
                {c && valid(c) > 0 ? (
                  <div className="mt-4 space-y-3">
                    <StackedBar counts={c} kind="satisfaction" className="h-5" />
                    <ChoiceRows counts={c} kind="satisfaction" />
                    <p className="text-xs text-muted">{t("validAnswers", { n: f.int(valid(c)) })}</p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">{view.missing.includes(q.id) ? t("missingColumn") : t("noAnswers")}</p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Tabs */}
      <section id="cdp-tabs" className="scroll-mt-20">
        <div role="tablist" aria-label={t("tabsLabel")} className="flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 print:hidden">
          {TABS.map((tb, i) => (
            <button
              key={tb.id}
              role="tab"
              id={`tab-${tb.id}`}
              aria-selected={tab === tb.id}
              aria-controls={`panel-${tb.id}`}
              tabIndex={tab === tb.id ? 0 : -1}
              onClick={() => setTab(tb.id)}
              onKeyDown={(e) => {
                const rtl = document.documentElement.dir === "rtl";
                const dir = e.key === "ArrowRight" ? (rtl ? -1 : 1) : e.key === "ArrowLeft" ? (rtl ? 1 : -1) : 0;
                if (!dir) return;
                const next = TABS[(i + dir + TABS.length) % TABS.length].id;
                setTab(next);
                document.getElementById(`tab-${next}`)?.focus();
              }}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition sm:text-base",
                tab === tb.id ? "bg-navy text-white" : "text-muted hover:text-navy",
              )}
            >
              <span className="me-1.5 text-xs opacity-70">{i + 1}</span>
              {locale === "ar" ? tb.ar : tb.en}
            </button>
          ))}
        </div>

        {TABS.map((tb) => (
          <div key={tb.id} role="tabpanel" id={`panel-${tb.id}`} aria-labelledby={`tab-${tb.id}`} hidden={tab !== tb.id} className="mt-5 space-y-4">
            <h2 className="text-xl font-bold text-navy sm:text-2xl">
              {locale === "ar" ? tb.ar : tb.en}
              <span className="ms-2 text-base font-medium text-muted">· {deptName} · {t("responsesN", { n: f.int(inView) })}</span>
            </h2>
            <div className="grid gap-4 xl:grid-cols-2">
              {QUESTIONS.filter((q) => q.tab === tb.id && !q.thanks && q.kind !== "text").map((q) => (
                <div key={q.id} className={q.kind === "satisfaction" ? "xl:col-span-2" : undefined}>
                  <QuestionCard q={q} header={view.questions[q.id]?.header ?? null} counts={counts[q.id]} missing={view.missing.includes(q.id)} highlight={q.kind === "satisfaction"} />
                </div>
              ))}
            </div>
            {QUESTIONS.filter((q) => q.tab === tb.id && q.kind === "text").map((q) => (
              <CommentsBlock
                key={q.id}
                q={q}
                header={view.questions[q.id]?.header ?? null}
                comments={view.comments}
                placeholders={view.placeholders[q.id] ?? 0}
                departments={view.departments}
                dept={dept}
                raw={view.raw}
                present={present}
                missing={view.missing.includes(q.id)}
              />
            ))}
            {tb.id === "huawei" && <Thanks view={view} dept={dept} present={present} />}
          </div>
        ))}
      </section>
    </div>
  );
}

function Thanks({ view, dept, present }: { view: DashboardView; dept: number | null; present: boolean }) {
  const t = useTranslations("Cdp");
  const f = useFormat();
  const thanks = QUESTIONS.filter((q) => q.thanks);
  const names = useMemo(() => (view.names ?? []).filter((n) => dept === null || n.d === dept), [view.names, dept]);
  const nameQ = thanks.find((q) => q.kind === "names")!;
  return (
    <section aria-labelledby="thanks-title" className="rounded-card border border-amber-200 bg-gradient-to-b from-amber-50/70 to-surface p-5 sm:p-7">
      <h2 id="thanks-title" className="flex items-center gap-2 text-xl font-bold text-navy">
        <Award className="size-5 text-amber-600" aria-hidden="true" />
        {t("thanksTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("thanksNote")}</p>
      {view.thanksBoard && (
        <Link href="/cdp/thanks" className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-navy shadow-sm hover:bg-amber-400" data-testid="board-link">
          <Heart className="size-4" aria-hidden="true" />
          {t("boardOpen")}
        </Link>
      )}

      <div className="mt-5 space-y-4">
        {view.missing.includes(nameQ.id) ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{nameQ.id}: {t("missingColumn")}</p>
        ) : (
          <PeopleRecognition view={view} dept={dept} present={present} />
        )}
        {view.names && !present && names.length > 0 && (
          <details className="rounded-card border border-line bg-surface p-5">
            <summary className="cursor-pointer text-sm font-semibold text-navy">
              <span className="me-2 rounded-full bg-canvas px-2 py-0.5 font-mono text-xs text-muted">{nameQ.id}</span>
              {t("namesAsWritten", { n: f.int(names.length) })}
            </summary>
            <p className="mt-2 whitespace-pre-line text-xs text-muted" dir="auto">{view.questions[nameQ.id]?.header?.trim()}</p>
            <ul className="mt-3 space-y-1.5 text-sm" data-testid="thanks-names">
              {names.map((n) => <li key={n.id} className="whitespace-pre-line rounded-lg bg-canvas px-3 py-1.5" dir="auto">{n.text}</li>)}
            </ul>
          </details>
        )}
        {thanks.filter((q) => q.kind === "thanks").map((q) =>
          view.raw ? (
            <CommentsBlock
              key={q.id}
              q={q}
              header={view.questions[q.id]?.header ?? null}
              comments={view.comments}
              placeholders={view.placeholders[q.id] ?? 0}
              departments={view.departments}
              dept={dept}
              raw={view.raw}
              present={present}
              missing={view.missing.includes(q.id)}
              withThemes={false}
            />
          ) : (
            <div key={q.id} id={`q-${q.id}`} className="rounded-card border border-line bg-surface p-5">
              <div className="mb-2 text-xs"><span className="rounded-full bg-canvas px-2 py-0.5 font-mono text-muted">{q.id}</span></div>
              <h3 className="whitespace-pre-line font-semibold text-navy" dir="auto">{view.questions[q.id]?.header?.trim() || q.ar}</h3>
              <p className="mt-2 flex items-start gap-2 text-sm text-muted" data-testid="thanks-locked">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t("thanksRestricted", { n: f.int(view.thanksCounts[q.id] ?? 0) })}
              </p>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
