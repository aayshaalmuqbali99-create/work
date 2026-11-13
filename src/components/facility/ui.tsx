import type { FacPriority, FacStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

/** Facility Hub primitives — consistent shape, spacing and focus behaviour. */
export const fhBtn = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-deep px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgb(45_19_234/0.7)] transition duration-200 hover:bg-deep-700 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50",
  accent:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-fink shadow-[0_10px_30px_-12px_rgb(255_120_0/0.8)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-fline bg-white px-5 py-2.5 text-sm font-semibold text-deep transition duration-200 hover:border-deep/40 hover:bg-lav-50 disabled:pointer-events-none disabled:opacity-50",
  ghost:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-deep transition hover:bg-lav-50 disabled:opacity-50",
  danger:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50",
  onDark:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition duration-200 hover:bg-white/20 hover:-translate-y-0.5",
};

export const fhInput =
  "w-full rounded-2xl border border-fline bg-white px-4 py-3 text-[15px] text-fink outline-none transition placeholder:text-fmuted/70 focus:border-deep focus:ring-4 focus:ring-deep/10 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/10";

export const fhCard = "rounded-[28px] border border-fline bg-white shadow-soft";

const STATUS_STYLE: Record<FacStatus, string> = {
  SUBMITTED: "bg-lav-100 text-deep ring-lav-200",
  UNDER_REVIEW: "bg-[#EAF8FF] text-[#0B5C80] ring-[#BFE6F7]",
  ASSIGNED: "bg-[#E9FBF8] text-[#0D6B63] ring-[#B5EEE7]",
  IN_PROGRESS: "bg-[#FFF3E6] text-[#9A4300] ring-[#FFD3A8]",
  ON_HOLD: "bg-[#FFF8E0] text-[#7A5A00] ring-[#FFE59A]",
  RESOLVED: "bg-[#E8F9EF] text-[#1B6B3E] ring-[#B9EBCD]",
  CLOSED: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  REOPENED: "bg-[#FFEDE7] text-[#A33A17] ring-[#FFC9B6]",
  CANCELLED: "bg-zinc-50 text-zinc-500 ring-zinc-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
};
const STATUS_DOT: Record<FacStatus, string> = {
  SUBMITTED: "bg-deep", UNDER_REVIEW: "bg-[#1D8FC4]", ASSIGNED: "bg-[#17A598]", IN_PROGRESS: "bg-gold", ON_HOLD: "bg-exotic",
  RESOLVED: "bg-fgreen", CLOSED: "bg-zinc-400", REOPENED: "bg-coral", CANCELLED: "bg-zinc-300", REJECTED: "bg-red-500",
};

export function StatusChip({ status, label, className }: { status: FacStatus; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1", STATUS_STYLE[status], className)}>
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status], status === "IN_PROGRESS" && "fh-pulse")} aria-hidden="true" />
      {label}
    </span>
  );
}

const PRIORITY_STYLE: Record<FacPriority, string> = {
  LOW: "text-fmuted bg-zinc-50 ring-zinc-200",
  MEDIUM: "text-deep bg-lav-50 ring-lav-200",
  HIGH: "text-[#9A4300] bg-[#FFF3E6] ring-[#FFD3A8]",
  EMERGENCY: "text-white bg-red-600 ring-red-600",
};
export function PriorityChip({ priority, label }: { priority: FacPriority; label: string }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", PRIORITY_STYLE[priority])}>{label}</span>;
}

export function SampleTag({ label }: { label: string }) {
  return <span className="inline-flex rounded-md bg-exotic/25 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#6B4E00]">{label}</span>;
}

export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-lav-200 bg-lav-50/60 px-6 py-14 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-3xl bg-white text-deep shadow-soft">{icon}</div>
      <h3 className="text-lg font-bold text-fink">{title}</h3>
      {text && <p className="mt-2 max-w-md text-sm text-fmuted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function FieldLabel({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-fink">
      {children}
      {hint && <span className="ms-1 font-normal text-fmuted">{hint}</span>}
    </label>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-red-600">
      {message}
    </p>
  );
}

/** Decorative spark (the brand's diamond) used sparingly as an accent, never shaped into arrows. */
export function Spark({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-2.5 rotate-45 rounded-[2px] bg-gold", className)} />;
}
