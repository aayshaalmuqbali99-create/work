"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Globe, Heart, Lock, Printer, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ThanksBoard } from "@/features/cdp/data";
import { setThanksBoardPublicAction } from "@/features/cdp/actions";
import { cn } from "@/lib/utils";
import { useFormat } from "./shared";

const MEDAL = ["bg-amber-400 text-navy", "bg-slate-300 text-navy", "bg-orange-300 text-navy"];

export function ThanksBoardView({ board }: { board: ThanksBoard }) {
  const t = useTranslations("Cdp");
  const tb = useTranslations("Brand");
  const f = useFormat();
  const router = useRouter();
  const [pending, start] = useTransition();
  const featured = board.people.filter((p) => p.mentions > 1);
  const others = board.people.filter((p) => p.mentions === 1);

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 print:max-w-none print:p-0">
      <div className="mb-5 flex flex-wrap items-center gap-2 print:hidden">
        <Link href="/?tab=huawei" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm text-navy hover:border-teal">
          <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          {t("backToResults")}
        </Link>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm text-navy hover:border-teal">
          <Printer className="size-4" aria-hidden="true" />
          {t("printNow")}
        </button>
        <span className={cn("ms-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium", board.isPublic ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900")} data-testid="board-visibility">
          {board.isPublic ? <Globe className="size-3.5" aria-hidden="true" /> : <Lock className="size-3.5" aria-hidden="true" />}
          {board.isPublic ? t("boardPublic") : t("boardPrivate")}
        </span>
        {board.canPublish && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              (board.isPublic || window.confirm(t("boardConfirmPublish"))) &&
              start(async () => {
                const r = await setThanksBoardPublicAction(!board.isPublic);
                if (r.ok) router.refresh();
              })
            }
            className={cn("rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60", board.isPublic ? "border border-line bg-surface text-navy" : "bg-navy text-white")}
          >
            {board.isPublic ? t("boardUnpublish") : t("boardPublish")}
          </button>
        )}
      </div>

      <section className="relative overflow-hidden rounded-card bg-navy px-6 py-10 text-center text-white sm:px-12 sm:py-14 print:rounded-none print:[print-color-adjust:exact]">
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-teal print:[print-color-adjust:exact]" aria-hidden="true" />
        <Heart className="relative mx-auto size-10 text-amber-300" aria-hidden="true" />
        <p className="relative mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200" lang="en" dir="ltr">Omantel | CDP Programme Evaluation 2026</p>
        <h1 className="relative mt-2 text-3xl font-bold sm:text-5xl">{t("boardTitle")}</h1>
        <p className="relative mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">{t("boardIntro")}</p>
        <p className="relative mt-4 text-sm text-white/60">{t("boardBasis", { n: f.int(board.respondents) })}</p>
      </section>

      {featured.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-xl font-bold text-navy"><Star className="size-5 fill-amber-400 text-amber-500" aria-hidden="true" />{t("boardFeatured")}</h2>
          <p className="mt-1 text-sm text-muted">{t("boardFeaturedNote")}</p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3" data-testid="board-featured">
            {featured.map((p, i) => (
              <li key={p.key} className={cn("flex items-center gap-3 rounded-card border bg-surface p-4 break-inside-avoid", i < 3 ? "border-amber-300 shadow-md shadow-amber-100" : "border-line")}>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold print:[print-color-adjust:exact]", MEDAL[i] ?? "bg-teal-light text-navy")}>{f.int(i + 1)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-lg font-semibold text-ink" dir="auto">{p.label}</span>
                  <span className="text-sm text-muted">{t("boardMentions", { n: f.int(p.mentions) })}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {others.length > 0 && (
        <section className="mt-8 break-inside-avoid">
          <h2 className="text-xl font-bold text-navy">{t("boardAlsoThanks")}</h2>
          <ul className="mt-4 flex flex-wrap gap-2" data-testid="board-others">
            {others.map((p) => (
              <li key={p.key} className="rounded-full border border-line bg-surface px-4 py-2 text-[15px] text-ink" dir="auto">{p.label}</li>
            ))}
          </ul>
        </section>
      )}

      {!board.people.length && <p className="mt-8 text-center text-muted">{t("noAnswers")}</p>}

      <p className="mt-10 border-t border-line pt-4 text-center text-sm text-muted">
        {t("boardFooter")} · {t("dataUpdated")}: {f.date(board.activatedAt)}
      </p>
      <p className="mt-2 text-center text-lg font-bold text-navy" lang="en" dir="ltr">{tb("omantelTagline")}</p>
    </main>
  );
}
