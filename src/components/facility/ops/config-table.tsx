"use client";

import { Fragment, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { deleteConfigAction, moveConfigAction, saveConfigAction, type ConfigEntity } from "@/features/facility/actions/config";
import { fhBtn, fhInput } from "../ui";

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "bool" | "select" | "multi" | "tags" | "time" | "days" | "date" | "email";
  options?: { value: string; label: string }[];
  help?: string;
  wide?: boolean;
  dir?: "ltr" | "rtl";
  nullable?: boolean;
};

export type ConfigRow = { id: string; values: Record<string, unknown>; cells: React.ReactNode[]; inactive?: boolean; extra?: React.ReactNode };

/**
 * Generic, accessible list editor for configuration: inline edit form per row, add, reorder, delete.
 * All validation happens on the server (saveConfigAction); field errors are shown next to inputs.
 */
export function ConfigTable({
  entity,
  title,
  help,
  columns,
  rows,
  fields,
  defaults,
  fixed = {},
  addLabel,
  canAdd = true,
  canMove = false,
  canDelete = false,
  rowActions,
}: {
  entity: ConfigEntity;
  title?: string;
  help?: string;
  columns: string[];
  rows: ConfigRow[];
  fields: FieldDef[];
  defaults: Record<string, unknown>;
  fixed?: Record<string, unknown>;
  addLabel?: string;
  canAdd?: boolean;
  canMove?: boolean;
  canDelete?: boolean;
  rowActions?: (row: ConfigRow) => React.ReactNode;
}) {
  const t = useTranslations("Fac.Common");
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null); // row id or "new"
  const [pending, start] = useTransition();

  const act = (fn: () => Promise<{ ok: boolean }>) => start(async () => { await fn(); router.refresh(); });

  return (
    <section className="rounded-[22px] border border-fline bg-white">
      {(title || canAdd) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fline px-5 py-4">
          <div>
            {title && <h2 className="font-extrabold text-fink">{title}</h2>}
            {help && <p className="mt-0.5 max-w-3xl text-sm text-fmuted">{help}</p>}
          </div>
          {canAdd && (
            <button className={cn(fhBtn.secondary, "min-h-10 py-2")} onClick={() => setEditing("new")} disabled={editing === "new"}>
              <Plus className="size-4" aria-hidden="true" /> {addLabel ?? t("add")}
            </button>
          )}
        </div>
      )}
      <AnimatePresence>
        {editing === "new" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-fline bg-lav-50/50">
            <EditForm entity={entity} id={null} fields={fields} values={{ ...defaults, ...fixed }} fixed={fixed} onDone={() => setEditing(null)} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs font-bold uppercase tracking-wide text-fmuted">
            <tr>
              {columns.map((c) => <th key={c} scope="col" className="whitespace-nowrap px-4 py-3 text-start">{c}</th>)}
              <th className="w-1 px-4 py-3"><span className="sr-only">{t("actions")}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fline">
            {rows.length === 0 && <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-fmuted">—</td></tr>}
            {rows.map((r, i) => (
              <Fragment key={r.id}>
                <tr className={cn("align-top transition hover:bg-lav-50/40", r.inactive && "text-fmuted")}>
                  {r.cells.map((c, j) => <td key={j} className="px-4 py-3">{c}</td>)}
                  <td className="whitespace-nowrap px-4 py-2 text-end">
                    <div className="flex justify-end gap-1">
                      {rowActions?.(r)}
                      {r.extra}
                      {canMove && (
                        <>
                          <IconBtn label={t("moveUp")} disabled={pending || i === 0} onClick={() => act(() => moveConfigAction(entity, r.id, -1))}><ArrowUp className="size-4" /></IconBtn>
                          <IconBtn label={t("moveDown")} disabled={pending || i === rows.length - 1} onClick={() => act(() => moveConfigAction(entity, r.id, 1))}><ArrowDown className="size-4" /></IconBtn>
                        </>
                      )}
                      <IconBtn label={t("edit")} onClick={() => setEditing(editing === r.id ? null : r.id)}><Pencil className="size-4" /></IconBtn>
                      {canDelete && <IconBtn label={t("delete")} disabled={pending} onClick={() => confirm(`${t("delete")}?`) && act(() => deleteConfigAction(entity, r.id))}><Trash2 className="size-4 text-red-600" /></IconBtn>}
                    </div>
                  </td>
                </tr>
                {editing === r.id && (
                  <tr className="bg-lav-50/50">
                    <td colSpan={columns.length + 1}>
                      <EditForm entity={entity} id={r.id} fields={fields} values={{ ...r.values, ...fixed }} fixed={fixed} onDone={() => setEditing(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className="grid size-9 place-items-center rounded-full text-fmuted transition hover:bg-lav-100 hover:text-deep disabled:opacity-30">
      {children}
    </button>
  );
}

export function EditForm({ entity, id, fields, values, fixed = {}, onDone }: { entity: ConfigEntity; id: string | null; fields: FieldDef[]; values: Record<string, unknown>; fixed?: Record<string, unknown>; onDone?: () => void }) {
  const t = useTranslations("Fac");
  const router = useRouter();
  const [v, setV] = useState<Record<string, unknown>>(values);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: string, x: unknown) => setV((o) => ({ ...o, [k]: x }));
  const days = [0, 1, 2, 3, 4, 5, 6];

  const save = () =>
    start(async () => {
      const payload = { ...v, ...fixed };
      for (const f of fields) {
        if (f.nullable && payload[f.name] === "") payload[f.name] = null;
        if (f.type === "number" && payload[f.name] === "") payload[f.name] = f.nullable ? null : 0;
      }
      const r = await saveConfigAction(entity, id, payload);
      if (r.ok) {
        setMsg(t("Common.saved"));
        setErrors({});
        router.refresh();
        onDone?.();
      } else {
        setErrors(r.fields ?? {});
        setMsg(r.error === "duplicate" ? "Duplicate" : r.error === "scope" ? t("Ops.detail.unconfirmedScope") : r.error === "self" ? t("Common.forbidden") : t("Common.invalid"));
      }
    });

  return (
    <form
      className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {fields.map((f) => {
        const idf = `cf-${entity}-${id ?? "new"}-${f.name}`;
        const err = errors[f.name];
        const val = v[f.name];
        return (
          <div key={f.name} className={cn(f.wide && "sm:col-span-2 lg:col-span-3", f.type === "bool" && "flex items-end")}>
            {f.type === "bool" ? (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
                <input id={idf} type="checkbox" checked={!!val} onChange={(e) => set(f.name, e.target.checked)} className="size-5 accent-[#2D13EA]" />
                {f.label}
              </label>
            ) : (
              <>
                <label htmlFor={idf} className="mb-1.5 block text-sm font-semibold">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea id={idf} rows={6} dir={f.dir} value={String(val ?? "")} onChange={(e) => set(f.name, e.target.value)} className={cn(fhInput, "text-sm")} aria-invalid={!!err} />
                ) : f.type === "select" ? (
                  <select id={idf} value={String(val ?? "")} onChange={(e) => set(f.name, e.target.value)} className={cn(fhInput, "text-sm")} aria-invalid={!!err}>
                    {f.nullable && <option value="">—</option>}
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "multi" ? (
                  <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={idf}>
                    <span id={idf} className="sr-only">{f.label}</span>
                    {f.options?.map((o) => {
                      const arr = (val as string[]) ?? [];
                      const on = arr.includes(o.value);
                      return (
                        <button key={o.value} type="button" aria-pressed={on} onClick={() => set(f.name, on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
                          className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold transition", on ? "border-deep bg-deep text-white" : "border-fline bg-white hover:border-lav-200")}>
                          {on && <Check className="me-1 inline size-3" />}{o.label}
                        </button>
                      );
                    })}
                  </div>
                ) : f.type === "tags" ? (
                  <input id={idf} dir="ltr" value={((val as string[]) ?? []).join(", ")} onChange={(e) => set(f.name, e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className={cn(fhInput, "text-sm")} aria-invalid={!!err} />
                ) : f.type === "days" ? (
                  <div className="flex flex-wrap gap-1.5">
                    {days.map((d) => {
                      const arr = (val as number[]) ?? [];
                      const on = arr.includes(d);
                      return (
                        <button key={d} type="button" aria-pressed={on} onClick={() => set(f.name, on ? arr.filter((x) => x !== d) : [...arr, d].sort())}
                          className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", on ? "border-deep bg-deep text-white" : "border-fline bg-white")}>
                          {t(`Days.${d}` as "Days.0")}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    id={idf}
                    type={f.type === "number" ? "number" : f.type === "time" ? "time" : f.type === "date" ? "date" : f.type === "email" ? "email" : "text"}
                    dir={f.dir ?? (f.type === "email" ? "ltr" : undefined)}
                    value={val == null ? "" : String(val)}
                    onChange={(e) => set(f.name, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                    className={cn(fhInput, "text-sm")}
                    aria-invalid={!!err}
                  />
                )}
              </>
            )}
            {f.help && <p className="mt-1 text-xs text-fmuted">{f.help}</p>}
            {err && <p className="mt-1 text-xs font-semibold text-red-600">{err}</p>}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3">
        <button className={fhBtn.primary} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {t("Common.save")}</button>
        {onDone && <button type="button" className={fhBtn.ghost} onClick={onDone}><X className="size-4" /> {t("Common.cancel")}</button>}
        {msg && <span role="status" className="text-sm font-semibold text-fmuted">{msg}</span>}
      </div>
    </form>
  );
}

export function ActiveDot({ active, label }: { active: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
      <span className={cn("size-2 rounded-full", active ? "bg-fgreen" : "bg-zinc-300")} aria-hidden="true" /> {label}
    </span>
  );
}

export function VerificationBadge({ provisional, label }: { provisional: boolean; label: string }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ring-1", provisional ? "bg-[#FFF8E0] text-[#6B4E00] ring-[#FFE59A]" : "bg-[#E8F9EF] text-[#1B6B3E] ring-[#B9EBCD]")}>
      {label}
    </span>
  );
}
