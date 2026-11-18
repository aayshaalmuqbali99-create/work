"use client";

import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Info } from "lucide-react";
import type { QuestionDef } from "@/features/cdp/config";
import type { Counts } from "@/features/cdp/parse";
import { cn } from "@/lib/utils";
import { ChoiceRows, StackedBar, useFormat, valid } from "./shared";

export function QuestionText({ q, header }: { q: QuestionDef; header: string | null }) {
  const locale = useLocale();
  // Shown exactly as written in the file (line breaks kept, extra spaces removed).
  const text = header ? header.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n") : locale === "ar" ? q.ar : q.en;
  return <h3 className="whitespace-pre-line text-base font-semibold leading-relaxed text-ink sm:text-lg" dir="auto">{text}</h3>;
}

export function QuestionCard({
  q,
  header,
  counts,
  missing,
  highlight = false,
}: {
  q: QuestionDef;
  header: string | null;
  counts: Counts | undefined;
  missing: boolean;
  highlight?: boolean;
}) {
  const t = useTranslations("Cdp");
  const f = useFormat();
  const total = counts ? valid(counts) : 0;
  return (
    <article
      id={`q-${q.id}`}
      className={cn(
        "break-inside-avoid rounded-card border bg-surface p-5 print:p-3 print:shadow-none",
        highlight ? "border-teal/40 shadow-lg shadow-teal/5 ring-1 ring-teal/20" : "border-line",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        {highlight && <span className="rounded-full bg-navy px-2.5 py-0.5 font-semibold text-white">{t("satisfactionBadge")}</span>}
        {q.kind === "challenge" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 font-semibold text-orange-800 ring-1 ring-orange-200">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            {t("challengeBadge")}
          </span>
        )}
        <span className="rounded-full bg-canvas px-2 py-0.5 font-mono text-muted" title={t("columnHint")}>{q.id}</span>
      </div>
      <QuestionText q={q} header={header} />
      {q.kind === "challenge" && <p className="mt-2 text-sm text-muted">{t("challengeNote")}</p>}

      {missing ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("missingColumn")}
        </p>
      ) : !counts || total === 0 ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("noAnswers")}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <StackedBar counts={counts} kind={q.kind} className={highlight ? "h-6" : undefined} />
          <ChoiceRows counts={counts} kind={q.kind} large={highlight} />
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>{t("validAnswers", { n: f.int(total) })}</span>
            {counts.blank > 0 && <span>{t("blankAnswers", { n: f.int(counts.blank) })}</span>}
            {counts.invalid > 0 && <span className="text-amber-800">{t("invalidAnswers", { n: f.int(counts.invalid) })}</span>}
          </p>
        </div>
      )}
    </article>
  );
}
