"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Maximize2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type MapMarker = {
  id: string;
  kind: "POINT" | "ZONE";
  x: number; // 0…1
  y: number; // 0…1
  points: [number, number][] | null; // 0…1
  label: string;
  color: string;
  areaId: string | null;
};

type View = { s: number; x: number; y: number };

/**
 * Indoor floor-plan viewer: pan (drag), zoom (wheel, pinch, buttons), clickable markers and zones.
 * Coordinates are stored as fractions of the plan, so any image resolution or SVG works.
 * In edit mode, clicks on the plan are reported as fractions through `onPlanClick`.
 */
export function FloorMapViewer({
  src,
  width,
  height,
  markers,
  selectedId,
  onSelect,
  onPlanClick,
  draftPoints,
  className,
}: {
  src: string;
  width: number;
  height: number;
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (m: MapMarker) => void;
  onPlanClick?: (x: number, y: number) => void;
  draftPoints?: [number, number][];
  className?: string;
}) {
  const t = useTranslations("Fac.Map");
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 });
  const [fit, setFit] = useState(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ moved: boolean; start: { x: number; y: number } | null; pinch: number | null }>({ moved: false, start: null, pinch: null });

  const reset = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const f = Math.min(el.clientWidth / width, el.clientHeight / height);
    setFit(f);
    setView({ s: f, x: (el.clientWidth - width * f) / 2, y: (el.clientHeight - height * f) / 2 });
  }, [width, height]);

  useEffect(() => {
    reset();
    const ro = new ResizeObserver(reset);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [reset]);

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const el = box.current;
      if (!el) return;
      const px = cx ?? el.clientWidth / 2;
      const py = cy ?? el.clientHeight / 2;
      setView((v) => {
        const s = Math.min(Math.max(v.s * factor, fit * 0.8), fit * 8);
        const k = s / v.s;
        return { s, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
      });
    },
    [fit],
  );

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const local = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-marker]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    drag.current.moved = false;
    drag.current.start = local(e);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2 && drag.current.pinch) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(d / drag.current.pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
      drag.current.pinch = d;
      drag.current.moved = true;
      return;
    }
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    if (drag.current.start && Math.hypot(p.x - drag.current.start.x, p.y - drag.current.start.y) > 4) drag.current.moved = true;
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) drag.current.pinch = null;
    if (!drag.current.moved && onPlanClick && pointers.current.size === 0) {
      const p = local(e);
      const fx = (p.x - view.x) / (width * view.s);
      const fy = (p.y - view.y) / (height * view.s);
      if (fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1) onPlanClick(fx, fy);
    }
    drag.current.start = null;
  };

  const btn = "grid size-10 place-items-center rounded-full bg-white text-deep shadow-soft transition hover:bg-lav-50";
  return (
    <div className={cn("relative overflow-hidden rounded-[24px] border border-fline bg-lav-50", className)} dir="ltr">
      <div
        ref={box}
        className={cn("fh-map-stage absolute inset-0 select-none", onPlanClick && "cursor-crosshair")}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className="absolute left-0 top-0 origin-top-left" style={{ width, height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" draggable={false} width={width} height={height} className="pointer-events-none block size-full" />
          <svg viewBox={`0 0 ${width} ${height}`} className="pointer-events-none absolute inset-0 size-full">
            {markers
              .filter((m) => m.kind === "ZONE" && m.points && m.points.length > 2)
              .map((m) => (
                <polygon
                  key={m.id}
                  data-marker
                  points={m.points!.map(([x, y]) => `${x * width},${y * height}`).join(" ")}
                  fill={m.color}
                  fillOpacity={selectedId === m.id ? 0.35 : 0.16}
                  stroke={m.color}
                  strokeWidth={(selectedId === m.id ? 3 : 2) / view.s}
                  className="pointer-events-auto cursor-pointer transition-[fill-opacity]"
                  onClick={() => onSelect?.(m)}
                />
              ))}
            {draftPoints && draftPoints.length > 0 && (
              <polyline points={draftPoints.map(([x, y]) => `${x * width},${y * height}`).join(" ")} fill="none" stroke="#FF7800" strokeWidth={2.5 / view.s} strokeDasharray={`${6 / view.s} ${4 / view.s}`} />
            )}
          </svg>
          {markers.map((m) => (
            <button
              key={m.id}
              type="button"
              data-marker
              onClick={() => onSelect?.(m)}
              aria-label={m.label}
              aria-pressed={selectedId === m.id}
              className="absolute"
              style={{ left: m.x * width, top: m.y * height, transform: `translate(-50%, -100%) scale(${1 / view.s})`, transformOrigin: "50% 100%" }}
            >
              <span className={cn("flex flex-col items-center transition", selectedId === m.id && "scale-110")}>
                <span className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold text-white shadow-lift" style={{ background: m.color }}>{m.label}</span>
                <span className="-mt-0.5 size-2.5 rotate-45" style={{ background: m.color }} />
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="absolute bottom-3 end-3 flex flex-col gap-2">
        <button type="button" className={btn} onClick={() => zoomAt(1.3)} aria-label={t("zoomIn")}><Plus className="size-4" /></button>
        <button type="button" className={btn} onClick={() => zoomAt(1 / 1.3)} aria-label={t("zoomOut")}><Minus className="size-4" /></button>
        <button type="button" className={btn} onClick={reset} aria-label={t("reset")}><Maximize2 className="size-4" /></button>
      </div>
    </div>
  );
}
