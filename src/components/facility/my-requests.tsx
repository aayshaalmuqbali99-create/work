"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Camera, ClipboardList, Search, SearchX } from "lucide-react";
import type { FacService, FacStatus } from "@prisma/client";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { FINISHED, progressOf } from "@/features/facility/domain/status";
import { formatDate } from "@/features/facility/format";
import { EmptyState, StatusChip, fhBtn, fhInput } from "./ui";
import { CategoryIcon } from "./icons";

export type MyRequestRow = {
  id: string;
  reference: string;
  status: FacStatus;
  service: FacService;
  createdAt: string;
  location: string;
  issue: string;
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  photos: number;
};

export function MyRequests({ rows, categories }: { rows: MyRequestRow[]; categories: { id: string; name: string }[] }) {
  const t = useTranslations("Fac");
  const locale = useLocale();
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "open" | "finished">("all");
  const [status, setStatus] = useState("");
  const [cat, setCat] = useState("");

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!q || r.reference.toLowerCase().includes(q.trim().toLowerCase())) &&
          (tab === "all" || (tab === "open" ? !FINISHED.has(r.status) : FINISHED.has(r.status))) &&
          (!status || r.status === status) &&
          (!cat || r.categoryId === cat),
      ),
    [rows, q, tab, status, cat],
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="size-7" />}
        title={t("Requests.empty")}
        text={t("Requests.emptyText")}
        action={<Link href="/facility/request" className={fhBtn.primary}>{t("Home.report")}</Link>}
      />
    );
  }

  const statuses = Array.from(new Set(rows.map((r) => r.status)));
  return (
    <div>
      <div className="flex flex-col gap-3 rounded-[24px] border border-fline bg-white p-3 shadow-soft lg:flex-row lg:items-center">
        <div className="flex rounded-full bg-lav-50 p-1" role="tablist">
          {(["all", "open", "finished"] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn("relative rounded-full px-4 py-2 text-sm font-semibold transition", tab === k ? "text-white" : "text-fmuted hover:text-deep")}
            >
              {tab === k && <motion.span layoutId="fh-req-tab" className="absolute inset-0 -z-0 rounded-full bg-deep" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className="relative">{k === "all" ? t("Common.all") : t(`Requests.${k}`)}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-fmuted" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Requests.search")} aria-label={t("Requests.search")} className={cn(fhInput, "ps-11")} dir="auto" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("Ops.filters.status")} className={cn(fhInput, "lg:w-48")}>
          <option value="">{t("Requests.allStatuses")}</option>
          {statuses.map((s) => <option key={s} value={s}>{t(`Status.${s}`)}</option>)}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t("Ops.filters.category")} className={cn(fhInput, "lg:w-56")}>
          <option value="">{t("Requests.allCategories")}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<SearchX className="size-7" />}
            title={t("Requests.noMatch")}
            action={<button onClick={() => { setQ(""); setTab("all"); setStatus(""); setCat(""); }} className={fhBtn.secondary}>{t("Requests.clear")}</button>}
          />
        </div>
      ) : (
        <motion.ul layout className="mt-6 grid gap-4">
          <AnimatePresence initial={false}>
            {filtered.map((r) => (
              <motion.li key={r.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Link href={`/facility/requests/${r.reference}`} className="group flex flex-col gap-4 rounded-[24px] border border-fline bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift sm:flex-row sm:items-center">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lav-50 text-deep">
                    <CategoryIcon name={r.categoryIcon} className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-deep" dir="ltr">{r.reference}</span>
                      <span className="text-xs text-fmuted">· {t(`Service.${r.service}`)}</span>
                    </div>
                    <p className="mt-1 truncate text-lg font-bold text-fink">{r.issue}</p>
                    <p className="truncate text-sm text-fmuted">{r.location}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-lav-100">
                        <div className={cn("h-full rounded-full", r.status === "CANCELLED" || r.status === "REJECTED" ? "bg-zinc-300" : "bg-deep")} style={{ width: `${progressOf(r.status) * 100}%` }} />
                      </div>
                      {r.photos > 0 && <span className="inline-flex items-center gap-1 text-xs text-fmuted"><Camera className="size-3.5" aria-hidden="true" />{r.photos}</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <StatusChip status={r.status} label={t(`Status.${r.status}`)} />
                    <span className="text-xs text-fmuted">{t("Requests.submittedOn", { date: formatDate(r.createdAt, locale) })}</span>
                  </div>
                  <Arrow className="hidden size-5 shrink-0 text-fmuted transition group-hover:text-deep sm:block" aria-hidden="true" />
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
