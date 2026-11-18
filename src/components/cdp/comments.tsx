"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Eye, EyeOff, Lock, MessageSquareText, Pencil, Search, Tag } from "lucide-react";
import { THEMES, type QuestionDef } from "@/features/cdp/config";
import type { CommentView } from "@/features/cdp/data";
import { setCommentThemesAction } from "@/features/cdp/actions";
import { cn } from "@/lib/utils";
import { QuestionText } from "./question-card";
import { useFormat } from "./shared";

const PAGE = 8;

export function CommentsBlock({
  q,
  header,
  comments,
  placeholders,
  departments,
  dept,
  raw,
  present,
  missing,
  withThemes = true,
}: {
  q: QuestionDef;
  header: string | null;
  comments: CommentView[];
  placeholders: number;
  departments: { name: string }[];
  dept: number | null;
  raw: boolean;
  present: boolean;
  missing: boolean;
  withThemes?: boolean;
}) {
  const t = useTranslations("Cdp");
  const locale = useLocale();
  const f = useFormat();
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const original = raw && showRaw && !present;

  const inScope = useMemo(() => comments.filter((c) => c.q === q.id && (dept === null || c.d === dept)), [comments, q.id, dept]);
  const themeCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of inScope) for (const th of c.themes) m.set(th, (m.get(th) ?? 0) + 1);
    return THEMES.map((th) => ({ ...th, count: m.get(th.id) ?? 0 })).sort((a, b) => b.count - a.count);
  }, [inScope]);
  const classified = inScope.filter((c) => c.themes.length).length;
  const shown = inScope.filter((c) => {
    if (theme && !c.themes.includes(theme)) return false;
    if (!query.trim()) return true;
    const hay = (original ? (c.raw ?? c.text) : c.text).toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });
  const max = Math.max(1, ...themeCounts.map((x) => x.count));
  const label = (id: string) => {
    const th = THEMES.find((x) => x.id === id);
    return th ? (locale === "ar" ? th.ar : th.en) : id;
  };

  return (
    <section id={`q-${q.id}`} className="break-inside-avoid rounded-card border border-line bg-surface p-5 print:p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-navy/5 px-2.5 py-0.5 font-semibold text-navy">
          <MessageSquareText className="size-3.5" aria-hidden="true" />
          {t("openAnswer")}
        </span>
        <span className="rounded-full bg-canvas px-2 py-0.5 font-mono text-muted">{q.id}</span>
      </div>
      <QuestionText q={q} header={header} />
      {missing ? (
        <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">{t("missingColumn")}</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">
            <strong className="text-2xl font-bold tabular-nums text-navy">{f.int(inScope.length)}</strong> {t("commentsCount")}
            {placeholders > 0 && dept === null && <span className="ms-2">· {t("placeholders", { n: f.int(placeholders) })}</span>}
          </p>

          {withThemes && inScope.length > 0 && (
            <div className="mt-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
                <Tag className="size-4" aria-hidden="true" />
                {t("themesTitle")}
              </h4>
              <p className="mt-1 text-xs text-muted">{t("themesNote", { classified: f.int(classified), total: f.int(inScope.length) })}</p>
              <ul className="mt-3 space-y-1.5">
                {themeCounts.map((th) => (
                  <li key={th.id}>
                    <button
                      type="button"
                      onClick={() => setTheme((v) => (v === th.id ? null : th.id))}
                      aria-pressed={theme === th.id}
                      disabled={!th.count}
                      className={cn(
                        "grid w-full grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 rounded-lg px-2 py-1 text-start text-sm transition sm:grid-cols-[minmax(0,15rem)_1fr_auto]",
                        theme === th.id ? "bg-teal-light" : "hover:bg-canvas",
                        !th.count && "opacity-50",
                      )}
                    >
                      <span className="truncate text-ink">{locale === "ar" ? th.ar : th.en}</span>
                      <span className="h-2.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                        <span className="block h-full rounded-full bg-navy print:[print-color-adjust:exact]" style={{ width: `${(th.count / max) * 100}%` }} />
                      </span>
                      <span className="tabular-nums text-muted">
                        {f.int(th.count)} <span className="text-xs">({f.pct(th.count, inScope.length)})</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {inScope.length > 0 && (
            <div className="mt-5 print:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">{t("search")}</span>
                  <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="w-full rounded-full border border-line bg-surface py-2 pe-3 ps-9 text-sm outline-none focus:border-navy"
                  />
                </label>
                {raw && !present && (
                  <button
                    type="button"
                    onClick={() => setShowRaw((v) => !v)}
                    aria-pressed={showRaw}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm text-navy hover:border-teal"
                  >
                    {showRaw ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    {showRaw ? t("hideOriginal") : t("showOriginal")}
                  </button>
                )}
              </div>
              {theme && (
                <p className="mt-2 text-xs text-muted">
                  {t("filteredByTheme", { theme: label(theme) })}{" "}
                  <button type="button" className="font-medium text-navy underline" onClick={() => setTheme(null)}>{t("clear")}</button>
                </p>
              )}
              {original && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
                  <Lock className="size-3.5" aria-hidden="true" />
                  {t("originalWarning")}
                </p>
              )}
              <ul className="mt-3 divide-y divide-line">
                {shown.slice(0, limit).map((c) => (
                  <CommentItem key={c.id} c={c} original={original} dept={c.d >= 0 ? departments[c.d]?.name : null} canEdit={raw && !present} label={label} />
                ))}
              </ul>
              {shown.length === 0 && <p className="py-3 text-sm text-muted">{t("noMatches")}</p>}
              {shown.length > limit && (
                <button type="button" onClick={() => setLimit((l) => l + PAGE * 3)} className="mt-2 text-sm font-medium text-navy underline">
                  {t("showMore", { n: f.int(shown.length - limit) })}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CommentItem({ c, original, dept, canEdit, label }: { c: CommentView; original: boolean; dept: string | null | undefined; canEdit: boolean; label: (id: string) => string }) {
  const t = useTranslations("Cdp");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState<string[]>(c.themes);
  const [pending, start] = useTransition();
  const save = (themes: string[] | null) =>
    start(async () => {
      const r = await setCommentThemesAction(c.key, themes);
      if (r.ok) {
        setEditing(false);
        router.refresh();
      }
    });
  return (
    <li className="py-3">
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink" dir="auto">{original ? (c.raw ?? c.text) : c.text}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded-full bg-canvas px-2 py-0.5 text-muted">{dept ?? t("deptHidden")}</span>
        {c.themes.map((th) => (
          <span key={th} className="rounded-full bg-teal-light px-2 py-0.5 text-navy">{label(th)}</span>
        ))}
        {c.manual && <span className="text-muted">· {t("manualThemes")}</span>}
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-navy hover:bg-canvas">
            <Pencil className="size-3" aria-hidden="true" />
            {t("editThemes")}
          </button>
        )}
      </div>
      {editing && (
        <fieldset className="mt-2 rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-medium text-navy">{t("editThemes")}</legend>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((th) => (
              <label key={th.id} className="inline-flex items-center gap-1.5 text-sm">
                <input type="checkbox" className="size-4 accent-navy" checked={sel.includes(th.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, th.id] : s.filter((x) => x !== th.id)))} />
                {label(th.id)}
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <button type="button" disabled={pending} onClick={() => save(sel)} className="rounded-full bg-navy px-4 py-1.5 font-semibold text-white disabled:opacity-60">{t("save")}</button>
            {c.manual && <button type="button" disabled={pending} onClick={() => save(null)} className="rounded-full border border-line px-4 py-1.5 text-navy">{t("resetAuto")}</button>}
            <button type="button" onClick={() => setEditing(false)} className="px-2 py-1.5 text-muted">{t("cancel")}</button>
          </div>
        </fieldset>
      )}
    </li>
  );
}
