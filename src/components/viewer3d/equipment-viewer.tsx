"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import {
  Boxes, Eye, EyeOff, Focus, Maximize2, Minimize2, Pause, Play, RotateCcw, Shrink, Tag, Expand,
} from "lucide-react";
import { getArchetype } from "./archetypes";
import { EquipmentScene, type SceneModel, type SceneState, type ViewPreset } from "./scene";
import type { PartInfo, ViewerModel } from "./types";
import { cn } from "@/lib/utils";

interface Props {
  model: ViewerModel | null;
  deviceName: string;
  fallbackImage: { src: string; width: number; height: number } | null;
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * InteractiveEquipmentViewer — rotate / zoom / pan, camera presets, fullscreen,
 * exploded view with speed + distance, component tree with show/hide/isolate, and an info panel.
 */
export function InteractiveEquipmentViewer({ model, deviceName, fallbackImage }: Props) {
  const t = useTranslations("Viewer");
  const locale = useLocale() as "ar" | "en";
  const reducedMotion = !!useReducedMotion();
  const archetype = model?.type === "illustrative" ? getArchetype(model.key) : undefined;
  /** Normalised scene model + flat part list for the tree and info panel. */
  const scene: { model: SceneModel; parts: PartInfo[]; typeName: string } | null = useMemo(() => {
    if (model?.type === "verified" && model.parts.length > 0) {
      return { model: { type: "verified", url: model.url, parts: model.parts }, parts: model.parts, typeName: "" };
    }
    if (archetype) {
      return {
        model: { type: "illustrative", archetype },
        parts: archetype.parts.map((p) => ({ id: p.id, en: p.en, ar: p.ar, fnEn: p.fnEn, fnAr: p.fnAr, parent: p.parent ?? null, explode: p.explode })),
        typeName: locale === "ar" ? archetype.ar : archetype.en,
      };
    }
    return null;
  }, [model, archetype, locale]);
  const verified = scene?.model.type === "verified";
  const wrapRef = useRef<HTMLDivElement>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [state, setState] = useState<SceneState>({
    exploded: false,
    paused: false,
    speed: 1,
    distance: 1,
    selected: null,
    hidden: new Set(),
    showLabels: true,
    locale,
    view: { preset: "iso", nonce: 0 },
  });

  useEffect(() => setWebgl(hasWebGL()), []);
  useEffect(() => setState((s) => ({ ...s, locale })), [locale]);
  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const set = useCallback((patch: Partial<SceneState>) => setState((s) => ({ ...s, ...patch })), []);
  const view = (preset: ViewPreset) => setState((s) => ({ ...s, view: { preset, nonce: s.view.nonce + 1 } }));

  const tree = useMemo(() => {
    if (!scene) return [];
    const ids = new Set(scene.parts.map((p) => p.id));
    const top = scene.parts.filter((p) => !p.parent || !ids.has(p.parent));
    return top.map((p) => ({ part: p, children: scene.parts.filter((c) => c.parent === p.id) }));
  }, [scene]);

  if (!scene || webgl === false) {
    return (
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        {fallbackImage && <Image src={fallbackImage.src} alt={deviceName} width={fallbackImage.width} height={fallbackImage.height} className="mx-auto h-72 w-auto object-contain" />}
        <p className="border-t border-line p-4 text-sm text-muted">{webgl === false ? t("noWebgl") : t("notAvailable")}</p>
      </div>
    );
  }

  const parts = scene.parts;
  const selected = parts.find((p) => p.id === state.selected) ?? null;
  const name = (p: PartInfo) => (locale === "ar" ? p.ar || p.en : p.en || p.ar);
  const otherName = (p: PartInfo) => (locale === "ar" ? p.en : p.ar);
  const toggleHidden = (id: string) =>
    setState((s) => {
      const hidden = new Set(s.hidden);
      if (hidden.has(id)) hidden.delete(id);
      else hidden.add(id);
      return { ...s, hidden, selected: hidden.has(id) && s.selected === id ? null : s.selected };
    });
  const isolate = (id: string) =>
    set({ hidden: new Set(parts.filter((p) => p.id !== id && p.parent !== id).map((p) => p.id)), selected: id });

  const parent = selected?.parent ? parts.find((p) => p.id === selected.parent) : undefined;
  const related = selected
    ? parts.filter((p) => p.id !== selected.id && (p.parent === selected.id || p.id === selected.parent || (selected.parent && p.parent === selected.parent)))
    : [];

  return (
    <section aria-label={t("title")} className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div ref={wrapRef} className={cn("relative overflow-hidden rounded-card border border-line bg-[#eef3f4]", fullscreen ? "h-dvh rounded-none" : "h-[420px] sm:h-[520px]")}>
        {webgl === null ? (
          <div className="grid h-full place-items-center text-sm text-muted">{t("loading")}</div>
        ) : (
          <EquipmentScene model={scene.model} state={state} onSelect={(id) => set({ selected: id })} reducedMotion={reducedMotion} />
        )}

        {/* Illustrative badge */}
        <p className={cn("pointer-events-none absolute start-3 top-3 z-30 max-w-[75%] rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow", verified ? "bg-emerald-700/90" : "bg-navy/90")}>
          {verified ? t("verified") : t("illustrative")}
        </p>

        {/* Camera views */}
        <div className="absolute end-3 top-3 z-30 flex flex-col gap-1.5">
          <IconBtn label={fullscreen ? t("exitFullscreen") : t("fullscreen")} onClick={() => (fullscreen ? document.exitFullscreen() : wrapRef.current?.requestFullscreen())}>
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </IconBtn>
          <IconBtn label={t("reset")} onClick={() => { set({ selected: null }); view("iso"); }}>
            <RotateCcw className="size-4" />
          </IconBtn>
        </div>
        <div className="absolute inset-x-3 bottom-3 z-30 flex flex-wrap items-center justify-center gap-1.5">
          {(["front", "rear", "top", "side", "iso"] as const).map((v) => (
            <button key={v} type="button" onClick={() => view(v)} className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-navy shadow-sm ring-1 ring-line transition hover:bg-teal hover:text-white">
              {t(`view_${v}`)}
            </button>
          ))}
        </div>
        <p className="pointer-events-none absolute bottom-14 start-3 z-30 hidden text-xs text-muted sm:block">{t("dragHint")}</p>
      </div>

      {/* Side panel */}
      <div className="flex flex-col gap-4">
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set({ exploded: !state.exploded, paused: false })}
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal"
            >
              {state.exploded ? <Shrink className="size-4" /> : <Expand className="size-4" />}
              {state.exploded ? t("assemble") : t("explode")}
            </button>
            <button type="button" onClick={() => set({ paused: !state.paused })} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm font-medium text-navy hover:border-teal">
              {state.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              {state.paused ? t("resume") : t("pause")}
            </button>
            <button type="button" aria-pressed={state.showLabels} onClick={() => set({ showLabels: !state.showLabels })} className={cn("inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium", state.showLabels ? "border-teal bg-teal-light text-teal" : "border-line text-navy")}>
              <Tag className="size-4" />
              {t("labels")}
            </button>
          </div>
          <Slider label={t("distance")} value={state.distance} min={0.3} max={2} step={0.05} onChange={(v) => set({ distance: v })} />
          <Slider label={t("speed")} value={state.speed} min={0.25} max={3} step={0.25} onChange={(v) => set({ speed: v })} suffix="×" />
        </div>

        {/* Info panel */}
        <div className="rounded-card border border-line bg-surface p-4" aria-live="polite">
          {selected ? (
            <div>
              <p className="text-xs text-muted">
                {deviceName} {parent && <>› {name(parent)}</>} › <span className="text-navy">{name(selected)}</span>
              </p>
              <h3 className="mt-2 text-lg font-semibold text-navy">{name(selected)}</h3>
              <p className="text-sm text-muted" lang={locale === "ar" ? "en" : "ar"} dir={locale === "ar" ? "ltr" : "rtl"}>{otherName(selected)}</p>
              <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-teal">{t("function")}</h4>
              <p className="mt-1 text-sm text-ink">{locale === "ar" ? selected.fnAr : selected.fnEn}</p>
              {related.length > 0 && (
                <>
                  <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-teal">{t("related")}</h4>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {related.map((p) => (
                      <button key={p.id} type="button" onClick={() => set({ selected: p.id })} className="rounded-full bg-canvas px-2.5 py-1 text-xs text-navy hover:bg-teal-light">{name(p)}</button>
                    ))}
                  </div>
                </>
              )}
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => isolate(selected.id)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-navy hover:border-teal"><Focus className="size-3.5" />{t("isolate")}</button>
                <button type="button" onClick={() => set({ hidden: new Set(), selected: null })} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-navy hover:border-teal"><Boxes className="size-3.5" />{t("fullAssembly")}</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">{t("selectHint")}</p>
          )}
        </div>

        {/* Component tree */}
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-navy">{t("components")} <span className="text-sm font-normal text-muted">({parts.length})</span></h3>
            <div className="flex gap-1">
              <button type="button" onClick={() => set({ hidden: new Set() })} className="rounded-full px-2 py-1 text-xs text-teal hover:bg-teal-light">{t("showAll")}</button>
              <button type="button" onClick={() => set({ hidden: new Set(parts.map((p) => p.id)), selected: null })} className="rounded-full px-2 py-1 text-xs text-muted hover:bg-canvas">{t("hideAll")}</button>
            </div>
          </div>
          {scene.typeName && <p className="mb-2 text-xs font-medium text-muted">{scene.typeName}</p>}
          <ul className="space-y-0.5 border-s border-line ps-2">
            {tree.map(({ part, children }) => (
              <li key={part.id}>
                <TreeRow part={part} label={name(part)} selected={state.selected === part.id} hidden={state.hidden.has(part.id)} onSelect={() => set({ selected: part.id })} onToggle={() => toggleHidden(part.id)} t={t} />
                {children.length > 0 && (
                  <ul className="ms-3 space-y-0.5 border-s border-line ps-2">
                    {children.map((c) => (
                      <li key={c.id}>
                        <TreeRow part={c} label={name(c)} selected={state.selected === c.id} hidden={state.hidden.has(c.id)} onSelect={() => set({ selected: c.id })} onToggle={() => toggleHidden(c.id)} t={t} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function TreeRow({ label, selected, hidden, onSelect, onToggle, t }: { part: PartInfo; label: string; selected: boolean; hidden: boolean; onSelect: () => void; onToggle: () => void; t: (k: string) => string }) {
  return (
    <div className={cn("flex items-center gap-1 rounded-lg", selected && "bg-teal-light")}>
      <button type="button" onClick={onSelect} className={cn("flex-1 truncate rounded-lg px-2 py-1.5 text-start text-sm", hidden ? "text-muted line-through" : "text-ink", selected && "font-semibold text-teal")}>
        {label}
      </button>
      <button type="button" onClick={onToggle} aria-label={hidden ? t("show") : t("hide")} title={hidden ? t("show") : t("hide")} className="rounded-md p-1.5 text-muted hover:text-navy">
        {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="inline-flex size-9 items-center justify-center rounded-full bg-white/90 text-navy shadow-sm ring-1 ring-line hover:bg-teal hover:text-white">
      {children}
    </button>
  );
}

function Slider({ label, value, min, max, step, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="mt-4 block">
      <span className="flex justify-between text-xs font-medium text-muted">
        <span>{label}</span>
        <span dir="ltr">{value.toFixed(2).replace(/\.?0+$/, "")}{suffix}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[#167d83]" />
    </label>
  );
}
