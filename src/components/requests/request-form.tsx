"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, GraduationCap, Plus, Send, ShoppingCart, Trash2 } from "lucide-react";
import { submitRequestAction, type RequestFormState } from "@/features/requests/actions";
import { cn } from "@/lib/utils";

type Option = { slug: string; name: string; quantity: number };

const input = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-[#1b6fd1] focus:ring-4 focus:ring-[#1b6fd1]/10 aria-[invalid=true]:border-red-500";

export function RequestForm({ options, initialSlug }: { options: Option[]; initialSlug?: string }) {
  const t = useTranslations("Request");
  const [state, action, pending] = useActionState<RequestFormState, FormData>(submitRequestAction, { ok: false });
  const [type, setType] = useState<"DONATION" | "PURCHASE">("DONATION");
  const [rows, setRows] = useState<{ slug: string; qty: number }[]>([{ slug: options.some((o) => o.slug === initialSlug) ? initialSlug! : "", qty: 1 }]);
  const err = (k: string) => (state.fieldErrors?.[k] ? t(state.fieldErrors[k]) : undefined);

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[24px] border border-line bg-surface p-10 text-center shadow-sm">
        <CheckCircle2 className="size-14 text-emerald-600" aria-hidden="true" />
        <h2 className="text-2xl font-bold text-navy">{t("sentTitle")}</h2>
        <p className="text-muted">{t("sentText")}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-navy hover:border-[#1b6fd1]">{t("newRequest")}</button>
      </div>
    );
  }

  return (
    <form
      className="space-y-6 rounded-[24px] border border-line bg-surface p-6 shadow-sm sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-navy">{t("type")}</legend>
        <input type="hidden" name="type" value={type} />
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ["DONATION", t("typeDonation"), GraduationCap],
            ["PURCHASE", t("typePurchase"), ShoppingCart],
          ] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={cn("flex items-center gap-3 rounded-2xl border-2 p-4 text-start text-sm font-semibold transition", type === value ? "border-[#1b6fd1] bg-[#e8f0fe] text-[#1b6fd1]" : "border-line text-ink hover:border-[#1b6fd1]/40")}
            >
              <Icon className="size-6 shrink-0" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {([
          ["name", t("name"), "text", "name"],
          ["organization", t("organization"), "text", "organization"],
          ["email", t("email"), "email", "email"],
          ["phone", t("phone"), "tel", "tel"],
          ["city", t("city"), "text", "address-level2"],
        ] as const).map(([name, label, type, ac]) => (
          <label key={name} className="block space-y-1.5">
            <span className="text-sm font-medium text-navy">{label}{name !== "city" && <span className="text-red-600"> *</span>}</span>
            <input name={name} type={type} autoComplete={ac} required={name !== "city"} dir={type === "email" || type === "tel" ? "ltr" : undefined} className={input} aria-invalid={!!err(name)} />
            {err(name) && <span className="block text-xs font-medium text-red-600">{err(name)}</span>}
          </label>
        ))}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-navy">{t("items")} <span className="text-red-600">*</span></legend>
        {rows.map((row, i) => {
          const opt = options.find((o) => o.slug === row.slug);
          return (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-canvas p-3">
              <select
                name="itemSlug"
                value={row.slug}
                onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, slug: e.target.value } : x)))}
                className={cn(input, "min-w-0 flex-1")}
                aria-label={t("chooseDevice")}
              >
                <option value="">{t("chooseDevice")}</option>
                {options.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
              </select>
              <input
                name="itemQty"
                type="number"
                min={1}
                max={opt?.quantity ?? 10000}
                value={row.qty}
                onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))}
                className={cn(input, "w-24")}
                aria-label={t("quantity")}
                dir="ltr"
              />
              {opt && <span className="text-xs text-muted">{t("available", { n: opt.quantity })}</span>}
              {rows.length > 1 && (
                <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} aria-label={t("remove")} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button>
              )}
            </div>
          );
        })}
        {err("items") && <p className="text-xs font-medium text-red-600">{err("items")}</p>}
        {rows.length < 30 && (
          <button type="button" onClick={() => setRows((r) => [...r, { slug: "", qty: 1 }])} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#1b6fd1] px-4 py-2 text-sm font-semibold text-[#1b6fd1] hover:bg-[#e8f0fe]">
            <Plus className="size-4" />{t("addItem")}
          </button>
        )}
      </fieldset>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-navy">{t("message")}</span>
        <textarea name="message" rows={4} className={input} />
        <span className="block text-xs text-muted">{t("messageHelp")}</span>
      </label>

      {state.message && !state.ok && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{t(state.message)}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-[#1b6fd1] px-7 py-3 font-semibold text-white shadow-lg shadow-[#1b6fd1]/30 transition hover:bg-[#2b7ff0] disabled:opacity-60">
          <Send className="size-4 rtl:-scale-x-100" />{pending ? t("sending") : t("submit")}
        </button>
        <p className="text-xs text-muted">{t("privacy")}</p>
      </div>
    </form>
  );
}
