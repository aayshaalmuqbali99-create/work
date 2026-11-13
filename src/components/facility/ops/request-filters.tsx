"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Download, Search, X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { fhInput } from "../ui";

type Opt = { value: string; label: string };

/** Filter bar: every change is reflected in the URL (shareable, back-button friendly). */
export function RequestFilterBar({ options, exportHref }: { options: Record<"status" | "service" | "priority" | "floor" | "wing" | "area" | "team" | "category", Opt[]>; exportHref: string }) {
  const t = useTranslations("Fac.Ops.filters");
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const update = (k: string, v: string) => {
    const next = new URLSearchParams(sp.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete("page");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  useEffect(() => {
    const id = setTimeout(() => (q !== (sp.get("q") ?? "") ? update("q", q) : undefined), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const sel = (k: keyof typeof options) => (
    <select key={k} value={sp.get(k) ?? ""} onChange={(e) => update(k, e.target.value)} aria-label={t(k)} className={cn(fhInput, "py-2.5 text-sm")}>
      <option value="">{t(k)}</option>
      {options[k].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
  const active = [...sp.keys()].some((k) => k !== "page");
  return (
    <div className={cn("rounded-[22px] border border-fline bg-white p-3 transition", pending && "opacity-70")}>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-[2fr_repeat(8,minmax(0,1fr))]">
        <div className="relative sm:col-span-2 md:col-span-4 xl:col-span-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-fmuted" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className={cn(fhInput, "py-2.5 ps-10 text-sm")} />
        </div>
        {(["status", "service", "priority", "floor", "wing", "area", "team", "category"] as const).map(sel)}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {(["open", "overdue"] as const).map((k) => (
          <button
            key={k}
            onClick={() => update(k, sp.get(k) === "1" ? "" : "1")}
            aria-pressed={sp.get(k) === "1"}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", sp.get(k) === "1" ? "border-deep bg-deep text-white" : "border-fline text-fmuted hover:border-lav-200")}
          >
            {t(k === "open" ? "onlyOpen" : "onlyOverdue")}
          </button>
        ))}
        {active && (
          <button onClick={() => { setQ(""); start(() => router.replace(pathname)); }} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-deep hover:bg-lav-50">
            <X className="size-3.5" /> {t("clear")}
          </button>
        )}
        <a href={exportHref} className="ms-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-deep hover:bg-lav-50">
          <Download className="size-3.5" aria-hidden="true" /> {t("export")}
        </a>
      </div>
    </div>
  );
}
