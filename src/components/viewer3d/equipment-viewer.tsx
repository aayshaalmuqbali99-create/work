"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import {
  Box, Boxes, Cable, CircleDot, CircuitBoard, Columns3, Cpu, Eye, EyeOff, Focus, Fan, Gauge, Layers, Maximize2, Minimize2,
  Monitor, Pause, Play, Plug, RadioTower, RotateCcw, RotateCw, Settings2, Speaker, Tag, ToggleRight, Zap, type LucideIcon,
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

/** Icon for a part, chosen from words in its id / English name. */
const ICONS: [RegExp, LucideIcon][] = [
  [/meter|display|screen|crt/i, Gauge],
  [/speaker|grille/i, Speaker],
  [/antenna|bnc|connector|input/i, RadioTower],
  [/socket|terminal|jack/i, Plug],
  [/switch|control|knob|button|selector|trigger/i, ToggleRight],
  [/heatsink|heat sink|fan|blade/i, Fan],
  [/pcb|board/i, CircuitBoard],
  [/component|chip|ic\b/i, Cpu],
  [/transformer|winding|power|battery|stator/i, Zap],
  [/panel|front/i, Monitor],
  [/case|cover|housing|enclosure|acrylic|frame/i, Box],
  [/standoff|feet|base|chassis|stand|arm|pillar/i, Columns3],
  [/cable|cord|shaft/i, Cable],
];
const iconFor = (p: PartInfo): LucideIcon => ICONS.find(([re]) => re.test(`${p.id} ${p.en}`))?.[1] ?? CircleDot;

type Mode = "normal" | "exploded" | "rotate" | "animate";

/**
 * InteractiveEquipmentViewer — showcase layout:
 * 3D model on a dark stage with view modes (normal / exploded / 360° / animation), camera presets and fullscreen;
 * a layer list with each part's function; a "main components" strip; part details, visibility and isolate.
 */
export function InteractiveEquipmentViewer({ model, deviceName, fallbackImage }: Props) {
  const t = useTranslations("Viewer");
  const locale = useLocale() as "ar" | "en";
  const reducedMotion = !!useReducedMotion();
  const archetype = model?.type === "illustrative" ? getArchetype(model.key) : undefined;
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
  const [mode, setMode] = useState<Mode>("normal");
  const [showSettings, setShowSettings] = useState(false);
  const [state, setState] = useState<SceneState>({
    exploded: false,
    paused: false,
    speed: 1,
    distance: 1,
    selected: null,
    hidden: new Set(),
    showLabels: true,
    autoRotate: false,
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

  // "Animation" mode: take apart and reassemble in a loop while slowly rotating.
  useEffect(() => {
    if (mode !== "animate" || state.paused) return;
    const ms = Math.max(1200, 3200 / state.speed);
    const id = setInterval(() => setState((s) => ({ ...s, exploded: !s.exploded })), ms);
    return () => clearInterval(id);
  }, [mode, state.paused, state.speed]);

  const chooseMode = (m: Mode) => {
    setMode(m);
    if (m === "normal") set({ exploded: false, autoRotate: false, paused: false });
    if (m === "exploded") set({ exploded: true, autoRotate: false, paused: false });
    if (m === "rotate") set({ autoRotate: true, paused: false });
    if (m === "animate") set({ exploded: true, autoRotate: !reducedMotion, paused: false });
  };

  const tree = useMemo(() => {
    if (!scene) return [];
    const ids = new Set(scene.parts.map((p) => p.id));
    const top = scene.parts.filter((p) => !p.parent || !ids.has(p.parent));
    return top.map((p) => ({ part: p, children: scene.parts.filter((c) => c.parent === p.id) }));
  }, [scene]);

  if (!scene || webgl === false) {
    return (
      <div className="overflow-hidden rounded-card border border-white/10 bg-white/5">
        {fallbackImage && <Image src={fallbackImage.src} alt={deviceName} width={fallbackImage.width} height={fallbackImage.height} className="mx-auto h-72 w-auto object-contain" />}
        <p className="border-t border-white/10 p-4 text-sm text-white/70">{webgl === false ? t("noWebgl") : t("notAvailable")}</p>
      </div>
    );
  }

  const parts = scene.parts;
  const selected = parts.find((p) => p.id === state.selected) ?? null;
  const name = (p: PartInfo) => (locale === "ar" ? p.ar || p.en : p.en || p.ar);
  const otherName = (p: PartInfo) => (locale === "ar" ? p.en : p.ar);
  const fn = (p: PartInfo) => (locale === "ar" ? p.fnAr : p.fnEn);
  const toggleHidden = (id: string) =>
    setState((s) => {
      const hidden = new Set(s.hidden);
      if (hidden.has(id)) hidden.delete(id);
      else hidden.add(id);
      return { ...s, hidden, selected: hidden.has(id) && s.selected === id ? null : s.selected };
    });
  const isolate = (id: string) => set({ hidden: new Set(parts.filter((p) => p.id !== id && p.parent !== id).map((p) => p.id)), selected: id });
  const parent = selected?.parent ? parts.find((p) => p.id === selected.parent) : undefined;

  const modes: { key: Mode; icon: LucideIcon; label: string }[] = [
    { key: "normal", icon: Box, label: t("modeNormal") },
    { key: "exploded", icon: Layers, label: t("modeExploded") },
    { key: "rotate", icon: RotateCw, label: t("modeRotate") },
    { key: "animate", icon: Play, label: t("modeAnimate") },
  ];

  return (
    <section aria-label={t("title")} className="min-w-0 space-y-4 text-white">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Stage */}
        <div ref={wrapRef} className={cn("relative overflow-hidden rounded-2xl border border-white/10 bg-[#0e2236] shadow-2xl shadow-black/30", fullscreen ? "h-dvh rounded-none" : "h-[440px] sm:h-[540px]")}>
          {webgl === null ? (
            <div className="grid h-full place-items-center text-sm text-white/60">{t("loading")}</div>
          ) : (
            <EquipmentScene model={scene.model} state={state} onSelect={(id) => set({ selected: id })} reducedMotion={reducedMotion} dark />
          )}

          <p className={cn("pointer-events-none absolute start-3 top-3 z-30 max-w-[70%] rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow", verified || archetype?.basis === "photos" ? "bg-emerald-600/90" : "bg-white/15 backdrop-blur")}>
            {verified ? t("verified") : archetype?.basis === "photos" ? t("fromPhotos") : t("illustrative")}
          </p>

          <div className="absolute end-3 top-3 z-30 flex flex-col gap-1.5">
            <StageBtn label={fullscreen ? t("exitFullscreen") : t("fullscreen")} onClick={() => (fullscreen ? document.exitFullscreen() : wrapRef.current?.requestFullscreen())}>
              {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </StageBtn>
            <StageBtn label={t("reset")} onClick={() => { chooseMode("normal"); set({ selected: null, hidden: new Set() }); view("iso"); }}>
              <RotateCcw className="size-4" />
            </StageBtn>
            <StageBtn label={t("settings")} onClick={() => setShowSettings((v) => !v)} active={showSettings}>
              <Settings2 className="size-4" />
            </StageBtn>
          </div>

          {showSettings && (
            <div className="absolute end-14 top-3 z-40 w-64 rounded-xl border border-white/10 bg-[#0b1b2b]/95 p-4 text-sm shadow-xl backdrop-blur">
              <div className="flex gap-2">
                <button type="button" onClick={() => set({ paused: !state.paused })} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium hover:border-[#3FB8BE]">
                  {state.paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}{state.paused ? t("resume") : t("pause")}
                </button>
                <button type="button" aria-pressed={state.showLabels} onClick={() => set({ showLabels: !state.showLabels })} className={cn("inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium", state.showLabels ? "border-[#3FB8BE] text-[#3FB8BE]" : "border-white/15")}>
                  <Tag className="size-3.5" />{t("labels")}
                </button>
              </div>
              <Slider label={t("distance")} value={state.distance} min={0.3} max={2} step={0.05} onChange={(v) => set({ distance: v })} />
              <Slider label={t("speed")} value={state.speed} min={0.25} max={3} step={0.25} onChange={(v) => set({ speed: v })} suffix="×" />
              <div className="mt-3 flex flex-wrap gap-1">
                {(["front", "rear", "top", "side", "iso"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => view(v)} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold hover:bg-[#167d83]">{t(`view_${v}`)}</button>
                ))}
              </div>
            </div>
          )}

          {/* View modes (bottom) */}
          <div className="absolute inset-x-3 bottom-3 z-30 flex flex-wrap gap-2" role="group" aria-label={t("modes")}>
            {modes.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={mode === key}
                onClick={() => chooseMode(key)}
                className={cn(
                  "flex min-w-[84px] flex-col items-center gap-1 rounded-xl border px-3 py-2 text-[11px] font-semibold backdrop-blur transition",
                  mode === key ? "border-[#3FB8BE] bg-[#1b6fd1] text-white shadow-lg shadow-[#1b6fd1]/30" : "border-white/15 bg-white/5 text-white/85 hover:border-white/40",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Layers with explanations (like an exploded-view legend) */}
        <aside className="flex flex-col gap-3">
          <div className="rounded-2xl border border-[#3b82c4]/40 bg-white/[0.04] p-4">
            <h3 className="mb-3 inline-flex rounded-full bg-[#1b6fd1] px-3 py-1 text-sm font-semibold">{t("layersTitle")}</h3>
            <ol className="space-y-1">
              {tree.map(({ part, children }) => {
                const Icon = iconFor(part);
                const active = state.selected === part.id || children.some((c) => c.id === state.selected);
                return (
                  <li key={part.id}>
                    <div className={cn("group flex items-start gap-2 rounded-xl p-2 transition", active ? "bg-[#1b6fd1]/25" : "hover:bg-white/5")}>
                      <button type="button" onClick={() => set({ selected: part.id })} className="flex flex-1 items-start gap-2 text-start">
                        <Icon className="mt-0.5 size-4 shrink-0 text-[#3FB8BE]" aria-hidden="true" />
                        <span>
                          <span className={cn("block text-sm font-semibold", state.hidden.has(part.id) && "line-through opacity-50")}>{name(part)}</span>
                          <span className="block text-xs leading-relaxed text-white/60">{fn(part)}</span>
                        </span>
                      </button>
                      <button type="button" onClick={() => toggleHidden(part.id)} aria-label={state.hidden.has(part.id) ? t("show") : t("hide")} title={state.hidden.has(part.id) ? t("show") : t("hide")} className="rounded-md p-1 text-white/50 hover:text-white">
                        {state.hidden.has(part.id) ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 flex gap-2 border-t border-white/10 pt-3 text-xs">
              <button type="button" onClick={() => set({ hidden: new Set() })} className="rounded-full px-2 py-1 text-[#3FB8BE] hover:bg-white/5">{t("showAll")}</button>
              <button type="button" onClick={() => set({ hidden: new Set(parts.map((p) => p.id)), selected: null })} className="rounded-full px-2 py-1 text-white/60 hover:bg-white/5">{t("hideAll")}</button>
            </div>
          </div>

          {/* Selected part */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" aria-live="polite">
            {selected ? (
              <div>
                <p className="text-xs text-white/50">{deviceName}{parent && <> › {name(parent)}</>}</p>
                <h3 className="mt-1 text-base font-semibold">{name(selected)}</h3>
                <p className="text-xs text-white/60" lang={locale === "ar" ? "en" : "ar"} dir={locale === "ar" ? "ltr" : "rtl"}>{otherName(selected)}</p>
                <p className="mt-2 text-sm text-white/85">{fn(selected)}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => isolate(selected.id)} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium hover:border-[#3FB8BE]"><Focus className="size-3.5" />{t("isolate")}</button>
                  <button type="button" onClick={() => set({ hidden: new Set(), selected: null })} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium hover:border-[#3FB8BE]"><Boxes className="size-3.5" />{t("fullAssembly")}</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/60">{t("selectHint")}</p>
            )}
          </div>
        </aside>
      </div>

      {/* Main components strip */}
      <div className="min-w-0 rounded-2xl border border-[#3b82c4]/40 bg-white/[0.04] p-4">
        <h3 className="mb-3 font-semibold">{t("mainComponents")}</h3>
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {parts.map((p) => {
            const Icon = iconFor(p);
            return (
              <li key={p.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => { set({ selected: p.id }); if (!state.exploded) chooseMode("exploded"); }}
                  className={cn("flex w-28 flex-col items-center gap-2 rounded-xl border p-3 text-center text-[11px] font-medium leading-tight transition", state.selected === p.id ? "border-[#3FB8BE] bg-[#1b6fd1]/25" : "border-white/10 bg-white/5 hover:border-white/30")}
                >
                  <span className="grid size-11 place-items-center rounded-lg bg-white/10"><Icon className="size-6 text-[#3FB8BE]" aria-hidden="true" /></span>
                  <span className="line-clamp-2">{name(p)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function StageBtn({ label, onClick, children, active = false }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cn("inline-flex size-9 items-center justify-center rounded-full text-white ring-1 backdrop-blur transition hover:bg-[#167d83]", active ? "bg-[#167d83] ring-[#3FB8BE]" : "bg-white/10 ring-white/15")}>
      {children}
    </button>
  );
}

function Slider({ label, value, min, max, step, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="mt-3 block">
      <span className="flex justify-between text-xs font-medium text-white/60">
        <span>{label}</span>
        <span dir="ltr">{value.toFixed(2).replace(/\.?0+$/, "")}{suffix}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[#3FB8BE]" />
    </label>
  );
}
