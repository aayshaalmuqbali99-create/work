"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import type { CategoryKey, LocalizedDevice } from "@/features/catalog/types";
import { DeviceCard } from "./device-card";
import { cn } from "@/lib/utils";

type Sort = "default" | "name" | "qtyDesc" | "priceAsc" | "priceDesc";

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[ً-ْ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");

export function EquipmentBrowser({
  devices,
  categories,
  initialCategory,
  initialQuery,
}: {
  devices: LocalizedDevice[];
  categories: { key: CategoryKey; count: number }[];
  initialCategory: CategoryKey | null;
  initialQuery: string;
}) {
  const t = useTranslations("Equipment");
  const tc = useTranslations("Categories");
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<CategoryKey | null>(initialCategory);
  const [sort, setSort] = useState<Sort>("default");

  /** Keep filters in the URL so links can be shared and the language switch preserves them. */
  function syncUrl(next: { q?: string; category?: CategoryKey | null }) {
    const q = next.q ?? query;
    const c = next.category === undefined ? category : next.category;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (c) params.set("category", c);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const list = devices.filter((d) => {
      if (category && d.category !== category) return false;
      if (!q) return true;
      const hay = normalize([d.nameEn, d.nameAr, d.brand ?? "", d.model ?? "", d.descEn, d.descAr, d.searchText].join(" "));
      return q.split(/\s+/).every((w) => hay.includes(w));
    });
    const price = (d: LocalizedDevice) => d.indicativeNewUnitPriceOMR ?? 0;
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "qtyDesc") list.sort((a, b) => b.quantity - a.quantity);
    if (sort === "priceAsc") list.sort((a, b) => price(a) - price(b));
    if (sort === "priceDesc") list.sort((a, b) => price(b) - price(a));
    return list;
  }, [devices, query, category, sort]);

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">{t("search")}</span>
          <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              syncUrl({ q: e.target.value });
            }}
            placeholder={t("search")}
            className="w-full rounded-full border border-line bg-surface py-3 pe-4 ps-11 text-sm outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/10"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          {t("sort")}
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-teal">
            <option value="default">{t("sortDefault")}</option>
            <option value="name">{t("sortName")}</option>
            <option value="qtyDesc">{t("sortQtyDesc")}</option>
            <option value="priceAsc">{t("sortPriceAsc")}</option>
            <option value="priceDesc">{t("sortPriceDesc")}</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("category")}>
        {[{ key: null, count: devices.length }, ...categories].map(({ key, count }) => {
          const active = category === key;
          return (
            <button
              key={key ?? "all"}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setCategory(key);
                syncUrl({ category: key });
              }}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition",
                active ? "border-navy bg-navy text-white" : "border-line bg-surface text-navy hover:border-teal",
              )}
            >
              {key ? tc(key) : t("all")} <span className={cn("ms-1 text-xs", active ? "text-white/70" : "text-muted")}>{count}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-muted" aria-live="polite">{t("results", { count: results.length })}</p>

      {results.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-line p-10 text-center">
          <p className="text-muted">{t("noResults")}</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory(null);
              syncUrl({ q: "", category: null });
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-navy hover:border-teal"
          >
            <X className="size-4" />
            {t("clear")}
          </button>
        </div>
      ) : (
        <motion.ul layout className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence initial={false}>
            {results.map((d) => (
              <motion.li key={d.slug} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}>
                <DeviceCard device={d} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
