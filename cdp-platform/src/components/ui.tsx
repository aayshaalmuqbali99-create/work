import { cn } from "@/lib/utils";

/** Small, consistent form primitives for the control panel. */
export const inputCls =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-teal focus:ring-4 focus:ring-teal/10 aria-[invalid=true]:border-red-500";

export function Field({
  label,
  htmlFor,
  help,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-navy">{label}</label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs font-medium text-red-600">{error}</p>
      ) : help ? (
        <p className="text-xs text-muted">{help}</p>
      ) : null}
    </div>
  );
}

export function Card({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-card border border-line bg-surface p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-semibold text-navy">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REVIEW: "bg-amber-50 text-amber-800 ring-amber-200",
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  ARCHIVED: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", STATUS_STYLE[status])}>{label}</span>;
}

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal disabled:cursor-not-allowed disabled:opacity-60";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-navy transition hover:border-teal disabled:opacity-60";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-surface px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60";
