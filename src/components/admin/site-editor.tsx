"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Eye, Monitor, Redo2, RotateCcw, Save, Send, Smartphone, Tablet, Undo2, Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { discardSiteDraftAction, publishSiteAction, restoreSiteVersionAction, saveSiteDraftAction, uploadLogoAction } from "@/features/site/actions";
import { contrast, type SiteContent } from "@/features/site/schema";
import { btnDanger, btnPrimary, btnSecondary, Card, Field, inputCls } from "./ui";
import { cn } from "@/lib/utils";

type Tab = "brand" | "colors" | "hero" | "sections" | "footer" | "history";
type Version = { id: string; status: string; note: string | null; publishedAt: string | null; by: string | null };

/** Count leaf values that differ between two content documents. */
function diffCount(a: unknown, b: unknown): number {
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return JSON.stringify(a) === JSON.stringify(b) ? 0 : 1;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let n = 0;
  keys.forEach((k) => (n += diffCount((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])));
  return n;
}

export function SiteEditor({ initial, published, versions }: { initial: SiteContent; published: SiteContent | null; versions: Version[] }) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("brand");
  // Undo/redo history of the whole document.
  const [history, setHistory] = useState<{ stack: SiteContent[]; index: number }>({ stack: [initial], index: 0 });
  const [saved, setSaved] = useState<SiteContent>(initial);
  const site = history.stack[history.index];
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const dirty = useMemo(() => diffCount(site, saved) > 0, [site, saved]);
  const changedVsLive = useMemo(() => diffCount(saved, published ?? {}), [saved, published]);

  const update = useCallback((fn: (s: SiteContent) => SiteContent) => {
    setHistory((h) => {
      const next = fn(structuredClone(h.stack[h.index]));
      const stack = [...h.stack.slice(0, h.index + 1), next].slice(-50);
      return { stack, index: stack.length - 1 };
    });
  }, []);
  const set = <K extends keyof SiteContent>(group: K, key: keyof SiteContent[K], value: unknown) =>
    update((s) => {
      (s[group] as Record<string, unknown>)[key as string] = value;
      return s;
    });

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: t(r.message ?? (r.ok ? "saved" : "forbidden")) });
      if (r.ok) after?.();
    });

  const saveDraft = () => run(() => saveSiteDraftAction(site), () => { setSaved(site); iframeRef.current?.contentWindow?.location.reload(); });

  const text = (group: "brand" | "hero" | "footer", key: string, label: string, opts: { area?: boolean; rtl?: boolean; ltr?: boolean } = {}) => {
    const id = `${group}-${key}`;
    const value = (site[group] as Record<string, unknown>)[key] as string;
    const dir = opts.rtl ? "rtl" : opts.ltr ? "ltr" : undefined;
    return (
      <Field label={label} htmlFor={id}>
        {opts.area ? (
          <textarea id={id} rows={3} value={value} dir={dir} onChange={(e) => set(group, key as never, e.target.value)} className={inputCls} />
        ) : (
          <input id={id} value={value} dir={dir} onChange={(e) => set(group, key as never, e.target.value)} className={inputCls} />
        )}
      </Field>
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "brand", label: t("tabBrand") },
    { key: "colors", label: t("tabColors") },
    { key: "hero", label: t("tabHero") },
    { key: "sections", label: t("tabSections") },
    { key: "footer", label: t("tabFooter") },
    { key: "history", label: t("tabHistory") },
  ];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-sm backdrop-blur">
        <button type="button" className={btnSecondary} disabled={history.index === 0} onClick={() => setHistory((h) => ({ ...h, index: h.index - 1 }))} aria-label={t("undo")} title={t("undo")}>
          <Undo2 className="size-4 rtl:-scale-x-100" />
        </button>
        <button type="button" className={btnSecondary} disabled={history.index >= history.stack.length - 1} onClick={() => setHistory((h) => ({ ...h, index: h.index + 1 }))} aria-label={t("redo")} title={t("redo")}>
          <Redo2 className="size-4 rtl:-scale-x-100" />
        </button>
        <button type="button" className={btnPrimary} disabled={pending || !dirty} onClick={saveDraft}><Save className="size-4" />{t("saveDraft")}</button>
        <button type="button" className={btnSecondary} onClick={() => setPreviewWidth((w) => (w === null ? 1280 : null))} aria-pressed={previewWidth !== null}>
          <Eye className="size-4" />{t("preview")}
        </button>
        <span className="text-sm" role="status" aria-live="polite">
          {dirty ? <span className="font-medium text-amber-700">● {t("unsaved")}</span> : msg ? <span className={msg.ok ? "text-emerald-700" : "text-red-600"}>{msg.text}</span> : null}
        </span>
        <span className="ms-auto text-xs text-muted">{changedVsLive ? t("changedFields", { n: changedVsLive }) : t("noChanges")}</span>
      </div>

      {previewWidth !== null && (
        <Card
          actions={
            <div className="flex gap-1.5" role="group" aria-label={t("preview")}>
              {[
                { w: 1280, icon: Monitor, label: t("previewDesktop") },
                { w: 820, icon: Tablet, label: t("previewTablet") },
                { w: 390, icon: Smartphone, label: t("previewMobile") },
              ].map(({ w, icon: Icon, label }) => (
                <button key={w} type="button" aria-pressed={previewWidth === w} onClick={() => setPreviewWidth(w)} className={cn(btnSecondary, previewWidth === w && "border-teal text-teal")}>
                  <Icon className="size-4" />{label}
                </button>
              ))}
            </div>
          }
        >
          <p className="mb-3 text-xs text-muted">{t("previewNote")}</p>
          <div className="overflow-x-auto rounded-xl border border-line bg-canvas p-2">
            <iframe
              ref={iframeRef}
              title={t("preview")}
              src={`/api/preview?on=1&to=/${locale}`}
              style={{ width: previewWidth, maxWidth: previewWidth > 900 ? "100%" : undefined }}
              className="mx-auto block h-[640px] rounded-lg bg-white shadow"
            />
          </div>
        </Card>
      )}

      <nav className="flex flex-wrap gap-1.5" role="tablist">
        {tabs.map((tb) => (
          <button key={tb.key} type="button" role="tab" aria-selected={tab === tb.key} onClick={() => setTab(tb.key)} className={cn("rounded-full border px-4 py-2 text-sm font-medium", tab === tb.key ? "border-navy bg-navy text-white" : "border-line bg-surface text-navy hover:border-teal")}>
            {tb.label}
          </button>
        ))}
      </nav>

      {tab === "brand" && (
        <Card>
          <p className="mb-4 text-xs text-muted">{t("emptyUsesDefault")}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {text("brand", "nameAr", t("brandNameAr"), { rtl: true })}
            {text("brand", "nameEn", t("brandNameEn"), { ltr: true })}
            {text("brand", "taglineAr", t("taglineAr"), { rtl: true })}
            {text("brand", "taglineEn", t("taglineEn"), { ltr: true })}
          </div>
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-navy">{t("logo")}</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid h-16 min-w-40 place-items-center rounded-xl border border-line bg-canvas px-4">
                {site.brand.logoUrl ? <Image src={site.brand.logoUrl} alt="" width={160} height={40} className="h-10 w-auto object-contain" /> : <span className="text-xs text-muted">{t("logoDefault")}</span>}
              </div>
              <label className={cn(btnSecondary, "cursor-pointer")}>
                <Upload className="size-4" />{t("upload")}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.set("file", file);
                    start(async () => {
                      const r = await uploadLogoAction(fd);
                      if (r.ok && r.url) set("brand", "logoUrl", r.url);
                      else setMsg({ ok: false, text: t(r.message ?? "uploadBadType") });
                    });
                  }}
                />
              </label>
              {site.brand.logoUrl && <button type="button" className={btnSecondary} onClick={() => set("brand", "logoUrl", null)}>{t("useDefaultLogo")}</button>}
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-navy">{t("partnerLogo")}</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid h-16 min-w-40 place-items-center rounded-xl border border-line bg-canvas px-4">
                {site.brand.partnerLogoUrl ? <Image src={site.brand.partnerLogoUrl} alt="" width={160} height={40} className="h-10 w-auto object-contain" /> : <span className="text-xs text-muted">—</span>}
              </div>
              <UploadButton label={t("upload")} onUploaded={(url) => set("brand", "partnerLogoUrl", url)} onError={(m) => setMsg({ ok: false, text: t(m) })} />
              {site.brand.partnerLogoUrl && <button type="button" className={btnSecondary} onClick={() => set("brand", "partnerLogoUrl", null)}>{t("removeSlide")}</button>}
            </div>
          </div>
        </Card>
      )}

      {tab === "colors" && (
        <Card>
          <div className="grid gap-5 md:grid-cols-2">
            {(
              [
                ["navy", t("colorNavy"), true],
                ["teal", t("colorTeal"), true],
                ["tealLight", t("colorTealLight"), false],
                ["background", t("colorBackground"), false],
              ] as const
            ).map(([key, label, checkWhite]) => {
              const value = site.theme[key];
              const ratio = contrast(value, "#FFFFFF");
              return (
                <Field key={key} label={label} htmlFor={`c-${key}`}>
                  <div className="flex items-center gap-3">
                    <input id={`c-${key}`} type="color" value={value} onChange={(e) => set("theme", key, e.target.value.toUpperCase())} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1" />
                    <input aria-label={label} value={value} dir="ltr" onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && set("theme", key, e.target.value.toUpperCase())} className={cn(inputCls, "w-32 font-mono")} />
                  </div>
                  {checkWhite && /^#[0-9A-F]{6}$/i.test(value) && (
                    <p className={cn("text-xs", ratio < 4.5 ? "font-medium text-amber-700" : "text-emerald-700")}>
                      {ratio < 4.5 ? t("contrastWarn", { ratio: ratio.toFixed(1) }) : t("contrastOk", { ratio: ratio.toFixed(1) })}
                    </p>
                  )}
                </Field>
              );
            })}
            <Field label={t("radius")} htmlFor="c-radius">
              <input id="c-radius" type="range" min={0} max={32} value={site.theme.radius} onChange={(e) => set("theme", "radius", Number(e.target.value))} className="w-full accent-[#167d83]" />
              <span className="text-xs text-muted" dir="ltr">{site.theme.radius}px</span>
            </Field>
            <label className="flex items-center gap-3 text-sm font-medium text-navy">
              <input type="checkbox" checked={site.theme.animations} onChange={(e) => set("theme", "animations", e.target.checked)} className="size-5 accent-[#167d83]" />
              {t("animations")}
            </label>
          </div>
          {/* Live sample of the colours */}
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl p-4" style={{ background: site.theme.background }}>
            <span className="rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: site.theme.navy }}>{t("tabBrand")}</span>
            <span className="rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: site.theme.teal }}>{t("preview")}</span>
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: site.theme.tealLight, color: site.theme.teal }}>{t("tabBrand")}</span>
            <span className="h-16 w-24 border bg-white" style={{ borderRadius: site.theme.radius }} />
          </div>
        </Card>
      )}

      {tab === "hero" && (
        <Card>
          <p className="mb-4 text-xs text-muted">{t("emptyUsesDefault")}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {text("hero", "eyebrowAr", t("heroEyebrowAr"), { rtl: true })}
            {text("hero", "eyebrowEn", t("heroEyebrowEn"), { ltr: true })}
            {text("hero", "titleAr", t("heroTitleAr"), { rtl: true })}
            {text("hero", "titleEn", t("heroTitleEn"), { ltr: true })}
            {text("hero", "subtitleAr", t("heroSubtitleAr"), { area: true, rtl: true })}
            {text("hero", "subtitleEn", t("heroSubtitleEn"), { area: true, ltr: true })}
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm font-medium text-navy">
            <input type="checkbox" checked={site.hero.showVisual} onChange={(e) => set("hero", "showVisual", e.target.checked)} className="size-5 accent-[#167d83]" />
            {t("showVisual")}
          </label>
          <div className="mt-6">
            <p className="text-sm font-medium text-navy">{t("heroSlides")}</p>
            <p className="mb-3 text-xs text-muted">{t("heroSlidesHelp")}</p>
            <ul className="flex flex-wrap gap-3">
              {site.hero.slides.map((sl, i) => (
                <li key={sl.url + i} className="relative overflow-hidden rounded-xl border border-line">
                  <Image src={sl.url} alt="" width={sl.width} height={sl.height} className="h-24 w-40 object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1">
                    <button type="button" disabled={i === 0} aria-label={t("moveUp")} onClick={() => update((d) => { [d.hero.slides[i - 1], d.hero.slides[i]] = [d.hero.slides[i], d.hero.slides[i - 1]]; return d; })} className="rounded px-1.5 text-xs text-white disabled:opacity-30">◀</button>
                    <button type="button" onClick={() => update((d) => { d.hero.slides.splice(i, 1); return d; })} className="rounded px-1.5 text-xs text-white">{t("removeSlide")}</button>
                    <button type="button" disabled={i === site.hero.slides.length - 1} aria-label={t("moveDown")} onClick={() => update((d) => { [d.hero.slides[i + 1], d.hero.slides[i]] = [d.hero.slides[i], d.hero.slides[i + 1]]; return d; })} className="rounded px-1.5 text-xs text-white disabled:opacity-30">▶</button>
                  </div>
                </li>
              ))}
              {site.hero.slides.length < 6 && (
                <li className="grid h-24 w-40 place-items-center rounded-xl border-2 border-dashed border-line">
                  <UploadButton
                    label={t("addSlide")}
                    withSize
                    onUploaded={(url, w, h) => update((d) => { d.hero.slides.push({ url, width: w ?? 1600, height: h ?? 900 }); return d; })}
                    onError={(m) => setMsg({ ok: false, text: t(m) })}
                  />
                </li>
              )}
            </ul>
          </div>
        </Card>
      )}

      {tab === "sections" && (
        <ol className="space-y-3">
          {site.sections.map((s, i) => (
            <li key={s.key}>
              <Card>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-teal-light text-sm font-bold text-teal" dir="ltr">{i + 1}</span>
                  <h3 className="font-semibold text-navy">{t(`section_${s.key}`)}</h3>
                  <label className="ms-auto flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={s.enabled} onChange={(e) => update((d) => { d.sections[i].enabled = e.target.checked; return d; })} className="size-5 accent-[#167d83]" />
                    {t("sectionVisible")}
                  </label>
                  <button type="button" className={btnSecondary} disabled={i === 0} aria-label={t("moveUp")} title={t("moveUp")} onClick={() => update((d) => { [d.sections[i - 1], d.sections[i]] = [d.sections[i], d.sections[i - 1]]; return d; })}><ArrowUp className="size-4" /></button>
                  <button type="button" className={btnSecondary} disabled={i === site.sections.length - 1} aria-label={t("moveDown")} title={t("moveDown")} onClick={() => update((d) => { [d.sections[i + 1], d.sections[i]] = [d.sections[i], d.sections[i + 1]]; return d; })}><ArrowDown className="size-4" /></button>
                </div>
                <div className={cn("grid gap-3 md:grid-cols-2", !s.enabled && "opacity-50")}>
                  {(["titleAr", "titleEn", "subtitleAr", "subtitleEn"] as const).map((k) => (
                    <input
                      key={k}
                      aria-label={`${t(`section_${s.key}`)} — ${t(k)}`}
                      placeholder={t(k)}
                      value={s[k]}
                      dir={k.endsWith("Ar") ? "rtl" : "ltr"}
                      onChange={(e) => update((d) => { d.sections[i][k] = e.target.value; return d; })}
                      className={inputCls}
                    />
                  ))}
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}

      {tab === "footer" && (
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            {text("footer", "textAr", t("footerTextAr"), { area: true, rtl: true })}
            {text("footer", "textEn", t("footerTextEn"), { area: true, ltr: true })}
            {text("footer", "email", t("email"), { ltr: true })}
            {text("footer", "phone", t("phone"), { ltr: true })}
            {text("footer", "addressAr", t("addressAr"), { rtl: true })}
            {text("footer", "addressEn", t("addressEn"), { ltr: true })}
          </div>
        </Card>
      )}

      {tab === "history" && (
        <Card>
          {versions.length === 0 ? (
            <p className="text-sm text-muted">{t("nothingPublishedYet")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", v.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600")}>
                    {v.status === "PUBLISHED" ? t("vCurrent") : t("status_ARCHIVED")}
                  </span>
                  <span className="text-muted">{v.publishedAt ? new Date(v.publishedAt).toLocaleString(locale === "ar" ? "ar-OM-u-nu-latn" : "en-GB") : ""}</span>
                  {v.by && <span className="text-navy">{v.by}</span>}
                  {v.note && <span className="text-ink">“{v.note}”</span>}
                  <button type="button" className={cn(btnSecondary, "ms-auto")} disabled={pending} onClick={() => run(() => restoreSiteVersionAction(v.id), () => window.location.reload())}>
                    <RotateCcw className="size-4" />{t("restoreToDraft")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Publish */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("publishNote")} htmlFor="publish-note" className="min-w-64 flex-1">
            <input id="publish-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </Field>
          <button
            type="button"
            className={btnPrimary}
            disabled={pending || dirty}
            title={dirty ? t("unsaved") : undefined}
            onClick={() => window.confirm(t("confirmPublish")) && run(() => publishSiteAction(note), () => { setNote(""); router.refresh(); })}
          >
            <Send className="size-4 rtl:-scale-x-100" />{t("publishSite")}
          </button>
          <button
            type="button"
            className={btnDanger}
            disabled={pending}
            onClick={() => window.confirm(t("confirmDiscard")) && run(() => discardSiteDraftAction(), () => window.location.reload())}
          >
            {t("discard")}
          </button>
        </div>
      </Card>
    </div>
  );
}

/** Small upload button that stores an image and returns its URL (and size). */
function UploadButton({ label, onUploaded, onError, withSize = false }: { label: string; onUploaded: (url: string, w?: number, h?: number) => void; onError: (messageKey: string) => void; withSize?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={cn(btnSecondary, "cursor-pointer", busy && "opacity-60")}>
      <Upload className="size-4" />
      {label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          const fd = new FormData();
          fd.set("file", file);
          const r = await uploadLogoAction(fd);
          setBusy(false);
          if (r.ok && r.url) onUploaded(r.url, withSize ? r.width : undefined, withSize ? r.height : undefined);
          else onError(r.message ?? "uploadBadType");
        }}
      />
    </label>
  );
}
