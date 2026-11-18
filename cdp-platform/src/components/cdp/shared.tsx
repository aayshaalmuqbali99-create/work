"use client";

import { useLocale, useTranslations } from "next-intl";
import type { QuestionKind } from "@/features/cdp/config";
import type { Counts } from "@/features/cdp/parse";
import { cn } from "@/lib/utils";

export const ORDER = ["y", "p", "n"] as const;
export type Choice = (typeof ORDER)[number];

/** Fixed colours. "Challenge" questions use their own palette because "yes" means a problem was met. */
export const COLORS: Record<"rating" | "challenge", Record<Choice, string>> = {
  rating: { y: "var(--cdp-yes)", p: "var(--cdp-partly)", n: "var(--cdp-no)" },
  challenge: { y: "var(--cdp-ch-yes)", p: "var(--cdp-ch-partly)", n: "var(--cdp-ch-no)" },
};
export const palette = (kind: QuestionKind) => COLORS[kind === "challenge" ? "challenge" : "rating"];

export function useFormat() {
  const locale = useLocale();
  const tag = locale === "ar" ? "ar-OM-u-nu-latn" : "en-GB";
  const pct = new Intl.NumberFormat(tag, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const int = new Intl.NumberFormat(tag);
  return {
    pct: (part: number, whole: number) => (whole > 0 ? `${pct.format(Math.round((part / whole) * 1000) / 10)}%` : "—"),
    int: (n: number) => int.format(n),
    date: (iso: string) => new Intl.DateTimeFormat(tag, { dateStyle: "long", timeStyle: "short" }).format(new Date(iso)),
  };
}

export const valid = (c: Counts) => c.y + c.p + c.n;

/** 100% stacked bar. Text labels are always shown next to it, so the bar never relies on colour alone. */
export function StackedBar({ counts, kind, className }: { counts: Counts; kind: QuestionKind; className?: string }) {
  const total = valid(counts);
  const colors = palette(kind);
  const f = useFormat();
  if (!total) return null;
  return (
    <div className={cn("flex h-4 w-full overflow-hidden rounded-full bg-line print:h-3", className)} aria-hidden="true">
      {ORDER.map((k) =>
        counts[k] ? (
          <span
            key={k}
            className="flex h-full items-center justify-center text-[10px] font-bold text-white print:[print-color-adjust:exact]"
            style={{ width: `${(counts[k] / total) * 100}%`, background: colors[k] }}
            title={f.pct(counts[k], total)}
          />
        ) : null,
      )}
    </div>
  );
}

export function useChoiceLabel() {
  const t = useTranslations("Cdp");
  return (kind: QuestionKind, k: Choice) => t(kind === "challenge" ? `challenge_${k}` : `answer_${k}`);
}

/** Count + percentage per choice, in the fixed order Yes | Partly | No. */
export function ChoiceRows({ counts, kind, large = false }: { counts: Counts; kind: QuestionKind; large?: boolean }) {
  const f = useFormat();
  const label = useChoiceLabel();
  const total = valid(counts);
  const colors = palette(kind);
  return (
    <dl className={cn("grid grid-cols-3 gap-2", large && "gap-3")}>
      {ORDER.map((k) => (
        <div key={k} className="rounded-xl border border-line bg-canvas/60 px-3 py-2">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <span className="inline-block size-2.5 shrink-0 rounded-full print:[print-color-adjust:exact]" style={{ background: colors[k] }} aria-hidden="true" />
            {label(kind, k)}
          </dt>
          <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span className={cn("font-bold tabular-nums text-navy", large ? "text-2xl" : "text-xl")}>{f.pct(counts[k], total)}</span>
            <span className="text-sm tabular-nums text-muted">({f.int(counts[k])})</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
