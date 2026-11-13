"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, UserCheck } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { opsBulkAssignAction } from "@/features/facility/actions/ops";
import { fhBtn, fhInput } from "../ui";

const Ctx = createContext<{ sel: Set<string>; toggle: (id: string) => void; all: (ids: string[], on: boolean) => void } | null>(null);

export function BulkProvider({ children, teams, enabled }: { children: React.ReactNode; teams: { id: string; label: string }[]; enabled: boolean }) {
  const t = useTranslations("Fac.Ops");
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [team, setTeam] = useState("");
  const [pending, start] = useTransition();
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const all = (ids: string[], on: boolean) => setSel(on ? new Set(ids) : new Set());
  return (
    <Ctx.Provider value={{ sel, toggle, all }}>
      {enabled && sel.size > 0 && (
        <div className="sticky top-20 z-20 mb-3 flex flex-wrap items-center gap-3 rounded-2xl bg-deep px-4 py-3 text-white shadow-lift">
          <span className="text-sm font-semibold">{t("filters.results", { count: sel.size })}</span>
          <select value={team} onChange={(e) => setTeam(e.target.value)} className={`${fhInput} max-w-64 py-2 text-sm`} aria-label={t("detail.team")}>
            <option value="">{t("detail.team")}</option>
            {teams.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
          <button
            disabled={!team || pending}
            onClick={() => start(async () => { await opsBulkAssignAction([...sel], team); setSel(new Set()); router.refresh(); })}
            className={`${fhBtn.accent} min-h-10 py-2`}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />} {t("detail.assign")}
          </button>
        </div>
      )}
      {children}
    </Ctx.Provider>
  );
}

export function RowCheck({ id, label }: { id: string; label: string }) {
  const c = useContext(Ctx);
  if (!c) return null;
  return <input type="checkbox" checked={c.sel.has(id)} onChange={() => c.toggle(id)} aria-label={label} className="size-4 accent-[#2D13EA]" />;
}
export function AllCheck({ ids, label }: { ids: string[]; label: string }) {
  const c = useContext(Ctx);
  if (!c) return null;
  return <input type="checkbox" checked={ids.length > 0 && ids.every((i) => c.sel.has(i))} onChange={(e) => c.all(ids, e.target.checked)} aria-label={label} className="size-4 accent-[#2D13EA]" />;
}
