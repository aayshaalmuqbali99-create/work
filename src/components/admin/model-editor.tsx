"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Save, Wand2 } from "lucide-react";
import { saveModelPartsAction } from "@/features/admin/model-actions";
import type { PartInfo, V3 } from "@/components/viewer3d/types";
import { ViewerLoader } from "@/components/viewer3d/viewer-loader";
import { btnPrimary, btnSecondary, Card, inputCls } from "./ui";

type Part = PartInfo & { node: string };

export function ModelEditor({ modelId, url, initialParts, deviceName }: { modelId: string; url: string; initialParts: Part[]; deviceName: string }) {
  const t = useTranslations("Admin");
  const [parts, setParts] = useState<Part[]>(initialParts);
  const [preview, setPreview] = useState<Part[]>(initialParts);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const update = (i: number, patch: Partial<Part>) => setParts((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const setVec = (i: number, axis: number, value: string) =>
    setParts((ps) =>
      ps.map((p, j) => {
        if (j !== i) return p;
        if (value === "" && p.explode) {
          const rest = p.explode.map((v, k) => (k === axis ? 0 : v));
          return { ...p, explode: rest.every((v) => v === 0) ? null : (rest as V3) };
        }
        const n = Number(value);
        if (!Number.isFinite(n)) return p;
        const v: V3 = [...(p.explode ?? [0, 0, 0])] as V3;
        v[axis] = n;
        return { ...p, explode: v };
      }),
    );

  return (
    <div className="space-y-5">
      <ViewerLoader model={{ type: "verified", url, parts: preview }} deviceName={deviceName} fallbackImage={null} />
      <Card
        title={t("modelEditorTitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={() => { const next = parts.map((p) => ({ ...p, explode: null })); setParts(next); setPreview(next); }}>
              <Wand2 className="size-4" />{t("resetAuto")}
            </button>
            <button type="button" className={btnSecondary} onClick={() => setPreview(parts)}>{t("explode3dPreview")}</button>
          </div>
        }
      >
        <p className="mb-4 text-sm text-muted">{t("modelEditorIntro")}</p>
        <ul className="space-y-4">
          {parts.map((p, i) => (
            <li key={p.id} className="rounded-xl border border-line p-4">
              <p className="mb-3 text-xs text-muted">{t("node")}: <code dir="ltr" className="rounded bg-canvas px-1.5 py-0.5">{p.node}</code></p>
              <div className="grid gap-3 md:grid-cols-2">
                <input aria-label={t("nameAr")} placeholder={t("nameAr")} value={p.ar} onChange={(e) => update(i, { ar: e.target.value })} dir="rtl" className={inputCls} />
                <input aria-label={t("nameEn")} placeholder={t("nameEn")} value={p.en} onChange={(e) => update(i, { en: e.target.value })} dir="ltr" className={inputCls} />
                <textarea aria-label={t("partFnAr")} placeholder={t("partFnAr")} rows={2} value={p.fnAr} onChange={(e) => update(i, { fnAr: e.target.value })} dir="rtl" className={inputCls} />
                <textarea aria-label={t("partFnEn")} placeholder={t("partFnEn")} rows={2} value={p.fnEn} onChange={(e) => update(i, { fnEn: e.target.value })} dir="ltr" className={inputCls} />
                <label className="text-sm text-navy">
                  {t("parentPart")}
                  <select value={p.parent ?? ""} onChange={(e) => update(i, { parent: e.target.value || null })} className={`${inputCls} mt-1`}>
                    <option value="">{t("none")}</option>
                    {parts.filter((o) => o.id !== p.id).map((o) => <option key={o.id} value={o.id}>{o.ar || o.en || o.node}</option>)}
                  </select>
                </label>
                <fieldset className="text-sm text-navy">
                  <legend>{t("explodeVec")}</legend>
                  <div className="mt-1 grid grid-cols-3 gap-2" dir="ltr">
                    {[0, 1, 2].map((axis) => (
                      <input
                        key={axis}
                        aria-label={`${t("explodeVec")} ${"xyz"[axis]}`}
                        type="number"
                        step={0.1}
                        min={-20}
                        max={20}
                        placeholder={t("auto")}
                        value={p.explode ? p.explode[axis] : ""}
                        onChange={(e) => setVec(i, axis, e.target.value)}
                        className={inputCls}
                      />
                    ))}
                  </div>
                </fieldset>
              </div>
            </li>
          ))}
        </ul>
        <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur">
          <button
            type="button"
            disabled={pending}
            className={btnPrimary}
            onClick={() =>
              start(async () => {
                const r = await saveModelPartsAction(modelId, parts);
                setMsg({ ok: r.ok, text: t(r.message ?? "saved") });
                if (r.ok) setPreview(parts);
              })
            }
          >
            <Save className="size-4" />{pending ? t("saving") : t("saveParts")}
          </button>
          {msg && (
            <p role="status" className={msg.ok ? "inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700" : "text-sm font-medium text-red-600"}>
              {msg.ok && <CheckCircle2 className="size-4" />}{msg.text}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
