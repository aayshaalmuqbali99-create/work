import type { FacRole, FacStatus } from "@prisma/client";

export const STATUSES: FacStatus[] = [
  "SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED", "REJECTED",
];

/** Statuses where the request no longer needs work. */
export const FINISHED: ReadonlySet<FacStatus> = new Set(["RESOLVED", "CLOSED", "CANCELLED", "REJECTED"]);
/** Statuses where SLA clocks are running. */
export const OPEN: ReadonlySet<FacStatus> = new Set(STATUSES.filter((s) => !FINISHED.has(s)));

/** Allowed status changes for Facility Operations. Contractors use a subset (see CONTRACTOR_TARGETS). */
export const TRANSITIONS: Record<FacStatus, FacStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "REJECTED", "CANCELLED"],
  UNDER_REVIEW: ["ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "REJECTED", "CANCELLED"],
  ASSIGNED: ["UNDER_REVIEW", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["ON_HOLD", "RESOLVED", "ASSIGNED"],
  ON_HOLD: ["IN_PROGRESS", "ASSIGNED", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED"],
  CANCELLED: [],
  REJECTED: ["REOPENED"],
};

const CONTRACTOR_TARGETS: ReadonlySet<FacStatus> = new Set(["IN_PROGRESS", "ON_HOLD", "RESOLVED"]);

export function canTransition(role: FacRole, from: FacStatus, to: FacStatus): boolean {
  if (!TRANSITIONS[from].includes(to)) return false;
  if (role === "AGENT" || role === "ADMIN") return true;
  if (role === "CONTRACTOR") return CONTRACTOR_TARGETS.has(to);
  return false;
}

/** Employee may cancel before work has started. */
export const employeeCanCancel = (s: FacStatus) => s === "SUBMITTED" || s === "UNDER_REVIEW";
/** Employee confirms the fix (closes) only after Facility Operations marked it resolved. */
export const employeeCanConfirm = (s: FacStatus) => s === "RESOLVED";

/** Employee may reopen a resolved/closed request within the configured window. */
export function employeeCanReopen(s: FacStatus, resolvedAt: Date | null, reopenDays: number, now = new Date()): boolean {
  if (s !== "RESOLVED" && s !== "CLOSED") return false;
  if (!resolvedAt) return s === "RESOLVED";
  return now.getTime() - resolvedAt.getTime() <= reopenDays * 864e5;
}

/** Ordered milestones shown in the employee progress bar. */
export const MILESTONES: FacStatus[] = ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

/** 0…1 progress for a status (for progress bars). */
export function progressOf(s: FacStatus): number {
  if (s === "CANCELLED" || s === "REJECTED") return 1;
  if (s === "REOPENED") return 0.25;
  if (s === "ON_HOLD") return 0.55;
  const i = MILESTONES.indexOf(s);
  return i < 0 ? 0 : (i + 1) / MILESTONES.length;
}

/** Status changes that send the employee an e-mail (template key). */
export const STATUS_EMAIL: Partial<Record<FacStatus, string>> = {
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  REOPENED: "REOPENED",
  CLOSED: "CLOSED",
};
