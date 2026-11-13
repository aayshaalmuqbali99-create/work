"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Small, dependency-free chart kit for the operations dashboard.
 * Palette (validated): Deep Sea #2D13EA = series 1, Gold Mountains #FF7800 = series 2.
 * Gold is below 3:1 against white, so every chart shows its values as text in ink colours and offers a table view.
 */
export const SERIES = ["#2D13EA", "#FF7800"] as const;

type Item = { key: string; label: string; value: number };

/** Horizontal bars, one series, sorted by the caller. Value labels in ink; hover highlights + tooltip. */
export function BarList({ items, total, color = SERIES[0], empty, suffix = "" }: { items: Item[]; total?: number; color?: string; empty: string; suffix?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="py-8 text-center text-sm text-fmuted">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((i, n) => {
        const pct = total ? Math.round((i.value / total) * 100) : null;
        return (
          <li
            key={i.key}
            className="group relative grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-lg py-0.5 sm:grid-cols-[minmax(0,12rem)_1fr_auto]"
            onMouseEnter={() => setHover(i.key)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="truncate text-sm text-fink" title={i.label}>{i.label}</span>
            <span className="relative h-3.5 overflow-hidden rounded-[4px] bg-lav-50">
              <motion.span
                className="absolute inset-y-0 start-0 rounded-[4px]"
                style={{ background: color, opacity: hover && hover !== i.key ? 0.45 : 1 }}
                initial={{ width: 0 }}
                animate={{ width: `${(i.value / max) * 100}%` }}
                transition={{ duration: 0.6, delay: n * 0.03, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span className="min-w-12 text-end text-sm font-semibold tabular-nums text-fink">
              {i.value}{suffix}
              {pct !== null && <span className="ms-1 text-xs font-normal text-fmuted">{pct}%</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Two-part share (e.g. Maintenance vs Cleaning) with legend and direct labels. */
export function SplitBar({ parts }: { parts: { label: string; value: number }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-4 gap-0.5 overflow-hidden rounded-[4px]">
        {parts.map((p, i) => (
          <motion.span
            key={p.label}
            title={`${p.label}: ${p.value}`}
            className="h-full first:rounded-s-[4px] last:rounded-e-[4px]"
            style={{ background: SERIES[i] }}
            initial={{ width: 0 }}
            animate={{ width: `${(p.value / total) * 100}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-center gap-2 text-sm text-fink">
            <span className="size-3 rounded-[3px]" style={{ background: SERIES[i] }} aria-hidden="true" />
            {p.label}
            <span className="font-semibold tabular-nums">{p.value}</span>
            <span className="text-xs text-fmuted">{Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Two-line monthly trend with a crosshair tooltip, legend and a table view. One y-axis. */
export function TrendChart({ data, labels, tableLabel }: { data: { label: string; a: number; b: number }[]; labels: [string, string]; tableLabel: string }) {
  const [hi, setHi] = useState<number | null>(null);
  const uid = useId();
  const W = 640;
  const H = 220;
  const pad = { l: 32, r: 12, t: 12, b: 28 };
  const max = Math.max(4, ...data.flatMap((d) => [d.a, d.b]));
  const niceMax = Math.ceil(max / 4) * 4;
  const x = (i: number) => pad.l + (data.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (data.length - 1));
  const y = (v: number) => pad.t + (1 - v / niceMax) * (H - pad.t - pad.b);
  const path = (k: "a" | "b") => data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d[k])}`).join(" ");
  const ticks = [0, niceMax / 4, niceMax / 2, (3 * niceMax) / 4, niceMax];

  return (
    <div>
      <ul className="mb-3 flex gap-5 text-sm text-fink">
        {labels.map((l, i) => (
          <li key={l} className="flex items-center gap-2"><span className="h-0.5 w-4 rounded" style={{ background: SERIES[i] }} aria-hidden="true" />{l}</li>
        ))}
      </ul>
      <div className="relative" dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${uid}-t`}>
          <title id={`${uid}-t`}>{`${labels[0]} / ${labels[1]}`}</title>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#E7E5F3" strokeWidth={1} />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#5B5870">{t}</text>
            </g>
          ))}
          {data.map((d, i) => (
            <text key={d.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#5B5870">{d.label}</text>
          ))}
          {hi !== null && <line x1={x(hi)} x2={x(hi)} y1={pad.t} y2={H - pad.b} stroke="#9C94FF" strokeWidth={1} strokeDasharray="3 3" />}
          {(["a", "b"] as const).map((k, si) => (
            <g key={k}>
              <motion.path d={path(k)} fill="none" stroke={SERIES[si]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9 }} />
              {data.map((d, i) => (
                <circle key={i} cx={x(i)} cy={y(d[k])} r={hi === i ? 5 : 4} fill={SERIES[si]} stroke="#fff" strokeWidth={2} />
              ))}
            </g>
          ))}
          {data.map((_, i) => (
            <rect
              key={i}
              x={x(i) - (W - pad.l - pad.r) / Math.max(1, data.length - 1) / 2}
              y={0}
              width={(W - pad.l - pad.r) / Math.max(1, data.length - 1)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHi(i)}
              onMouseLeave={() => setHi(null)}
            />
          ))}
        </svg>
        {hi !== null && (
          <div
            className="pointer-events-none absolute top-2 rounded-xl border border-fline bg-white px-3 py-2 text-xs shadow-lift"
            style={{ left: `${(x(hi) / W) * 100}%`, transform: `translateX(${hi > data.length / 2 ? "-105%" : "5%"})` }}
          >
            <p className="font-bold text-fink">{data[hi].label}</p>
            <p className="text-fink"><span className="me-1 inline-block size-2 rounded-full" style={{ background: SERIES[0] }} />{labels[0]}: <b>{data[hi].a}</b></p>
            <p className="text-fink"><span className="me-1 inline-block size-2 rounded-full" style={{ background: SERIES[1] }} />{labels[1]}: <b>{data[hi].b}</b></p>
          </div>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-deep">{tableLabel}</summary>
        <table className="mt-2 w-full text-start">
          <thead><tr className="text-xs text-fmuted"><th className="py-1 text-start font-semibold"></th><th className="text-end font-semibold">{labels[0]}</th><th className="text-end font-semibold">{labels[1]}</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.label} className="border-t border-fline"><td className="py-1">{d.label}</td><td className="text-end tabular-nums">{d.a}</td><td className="text-end tabular-nums">{d.b}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}

/** KPI tile: big number, label, optional emphasis. Clickable when href given (rendered by caller). */
export function KpiTile({ label, value, tone = "default", icon }: { label: string; value: number | string; tone?: "default" | "alert" | "accent" | "good"; icon?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "h-full rounded-[22px] border p-4 transition group-hover:-translate-y-0.5 group-hover:shadow-lift",
        tone === "alert" ? "border-red-200 bg-red-50" : tone === "accent" ? "border-transparent bg-deep text-white" : tone === "good" ? "border-[#B9EBCD] bg-[#F1FBF5]" : "border-fline bg-white",
      )}
    >
      <div className="flex items-center justify-between">
        <p className={cn("text-xs font-semibold", tone === "accent" ? "text-white/80" : tone === "alert" ? "text-red-800" : "text-fmuted")}>{label}</p>
        {icon}
      </div>
      <p className={cn("mt-2 text-3xl font-extrabold tabular-nums", tone === "accent" ? "text-white" : tone === "alert" ? "text-red-700" : "text-fink")}>{value}</p>
    </div>
  );
}
