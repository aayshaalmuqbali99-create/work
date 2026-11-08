"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Save } from "lucide-react";
import { saveDeviceAction } from "@/features/admin/device-actions";
import type { FormState } from "@/features/admin/schemas";
import { btnPrimary, Card, Field, inputCls } from "./ui";

export interface DeviceFormValues {
  id: string | null;
  nameEn: string;
  nameAr: string;
  brand: string;
  model: string;
  slug: string;
  categoryKey: string;
  archetype: string;
  condition: "UNVERIFIED" | "NEW" | "USED";
  quantity: number;
  marketPrice: string;
  descEn: string;
  descAr: string;
  usesEn: string[];
  usesAr: string[];
  benefitsEn: string[];
  benefitsAr: string[];
}

export function DeviceForm({
  values,
  categories,
  archetypes,
}: {
  values: DeviceFormValues;
  categories: { key: string; name: string }[];
  archetypes: { key: string; name: string }[];
}) {
  const t = useTranslations("Admin");
  const [state, action, pending] = useActionState<FormState, FormData>(saveDeviceAction, { ok: false });
  const [qty, setQty] = useState(values.quantity);
  const [showSaved, setShowSaved] = useState(false);
  const err = (k: string) => (state.fieldErrors?.[k] ? t(state.fieldErrors[k]) : undefined);
  const inv = (k: string) => ({ "aria-invalid": !!err(k), "aria-describedby": err(k) ? `${k}-error` : undefined });

  useEffect(() => {
    if (state.ok && state.at) {
      setShowSaved(true);
      const id = setTimeout(() => setShowSaved(false), 3500);
      return () => clearTimeout(id);
    }
  }, [state.ok, state.at]);

  const qtyChanged = values.id !== null && qty !== values.quantity;

  return (
    <form
      className="space-y-5"
      // Submit manually so React does not reset the fields (keeps the user's input when validation fails).
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="id" value={values.id ?? ""} />

      <Card title={t("sectionBasics")}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("nameAr")} htmlFor="nameAr" error={err("nameAr")}>
            <input id="nameAr" name="nameAr" defaultValue={values.nameAr} dir="rtl" lang="ar" className={inputCls} {...inv("nameAr")} />
          </Field>
          <Field label={t("nameEn")} htmlFor="nameEn" error={err("nameEn")}>
            <input id="nameEn" name="nameEn" defaultValue={values.nameEn} required dir="ltr" lang="en" className={inputCls} {...inv("nameEn")} />
          </Field>
          <Field label={t("brand")} htmlFor="brand" error={err("brand")}>
            <input id="brand" name="brand" defaultValue={values.brand} dir="ltr" className={inputCls} {...inv("brand")} />
          </Field>
          <Field label={t("model")} htmlFor="model" error={err("model")}>
            <input id="model" name="model" defaultValue={values.model} dir="ltr" className={inputCls} {...inv("model")} />
          </Field>
          <Field label={t("category")} htmlFor="categoryKey">
            <select id="categoryKey" name="categoryKey" defaultValue={values.categoryKey} className={inputCls}>
              <option value="">{t("none")}</option>
              {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={t("archetype")} htmlFor="archetype" help={t("archetypeHelp")}>
            <select id="archetype" name="archetype" defaultValue={values.archetype} className={inputCls}>
              <option value="">{t("none")}</option>
              {archetypes.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
            </select>
          </Field>
          <Field label={t("slug")} htmlFor="slug" help={t("slugHelp")} error={err("slug")} className="md:col-span-2">
            <input id="slug" name="slug" defaultValue={values.slug} dir="ltr" className={`${inputCls} font-mono`} {...inv("slug")} />
          </Field>
        </div>
      </Card>

      <Card title={t("sectionStock")}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={t("quantity")} htmlFor="quantity" error={err("quantity")}>
            <input id="quantity" name="quantity" type="number" min={0} step={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} dir="ltr" className={inputCls} {...inv("quantity")} />
          </Field>
          <Field label={t("condition")} htmlFor="condition">
            <select id="condition" name="condition" defaultValue={values.condition} className={inputCls}>
              {(["UNVERIFIED", "NEW", "USED"] as const).map((c) => <option key={c} value={c}>{t(`cond_${c}`)}</option>)}
            </select>
          </Field>
          <Field label={t("marketPrice")} htmlFor="marketPrice" help={t("marketPriceHelp")} error={err("marketPrice")}>
            <input id="marketPrice" name="marketPrice" inputMode="decimal" defaultValue={values.marketPrice} dir="ltr" className={inputCls} {...inv("marketPrice")} />
          </Field>
          {(qtyChanged || values.id === null) && (
            <Field label={t("quantityReason")} htmlFor="quantityReason" help={t("quantityReasonHelp")} error={err("quantityReason")} className="md:col-span-3">
              <input id="quantityReason" name="quantityReason" className={inputCls} {...inv("quantityReason")} />
            </Field>
          )}
        </div>
      </Card>

      <Card title={t("sectionContent")}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("descAr")} htmlFor="descAr" error={err("descAr")}>
            <textarea id="descAr" name="descAr" rows={4} defaultValue={values.descAr} dir="rtl" lang="ar" className={inputCls} {...inv("descAr")} />
          </Field>
          <Field label={t("descEn")} htmlFor="descEn" error={err("descEn")}>
            <textarea id="descEn" name="descEn" rows={4} defaultValue={values.descEn} dir="ltr" lang="en" className={inputCls} {...inv("descEn")} />
          </Field>
          <Field label={t("usesAr")} htmlFor="usesAr" help={t("onePerLine")} error={err("usesAr")}>
            <textarea id="usesAr" name="usesAr" rows={4} defaultValue={values.usesAr.join("\n")} dir="rtl" lang="ar" className={inputCls} {...inv("usesAr")} />
          </Field>
          <Field label={t("usesEn")} htmlFor="usesEn" help={t("onePerLine")} error={err("usesEn")}>
            <textarea id="usesEn" name="usesEn" rows={4} defaultValue={values.usesEn.join("\n")} dir="ltr" lang="en" className={inputCls} {...inv("usesEn")} />
          </Field>
          <Field label={t("benefitsAr")} htmlFor="benefitsAr" help={t("onePerLine")} error={err("benefitsAr")}>
            <textarea id="benefitsAr" name="benefitsAr" rows={3} defaultValue={values.benefitsAr.join("\n")} dir="rtl" lang="ar" className={inputCls} {...inv("benefitsAr")} />
          </Field>
          <Field label={t("benefitsEn")} htmlFor="benefitsEn" help={t("onePerLine")} error={err("benefitsEn")}>
            <textarea id="benefitsEn" name="benefitsEn" rows={3} defaultValue={values.benefitsEn.join("\n")} dir="ltr" lang="en" className={inputCls} {...inv("benefitsEn")} />
          </Field>
        </div>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur">
        <button type="submit" disabled={pending} className={btnPrimary}>
          <Save className="size-4" aria-hidden="true" />
          {pending ? t("saving") : values.id ? t("save") : t("create")}
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {showSaved && (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700"><CheckCircle2 className="size-4" />{t("saved")}</span>
          )}
          {!state.ok && state.message && <span className="font-medium text-red-600">{t(state.message)}</span>}
        </p>
      </div>
    </form>
  );
}
