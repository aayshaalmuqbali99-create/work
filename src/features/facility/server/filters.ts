import "server-only";
import type { FacPriority, FacService, FacStatus, Prisma } from "@prisma/client";
import { STATUSES, FINISHED } from "../domain/status";
import { REFERENCE_RE } from "../domain/reference";
import type { FacUserSession } from "./session";
import { visibleWhere } from "./queries";

export type RequestFilters = { q?: string; status?: string; service?: string; priority?: string; floor?: string; team?: string; category?: string; overdue?: string; open?: string; page?: string };

/** Turn URL filters into a Prisma where clause (always combined with the user's visibility). */
export function filtersToWhere(user: FacUserSession, f: RequestFilters): Prisma.FacRequestWhereInput {
  const and: Prisma.FacRequestWhereInput[] = [visibleWhere(user)];
  const q = (f.q ?? "").trim().slice(0, 100);
  if (q) {
    and.push(
      REFERENCE_RE.test(q.toUpperCase())
        ? { reference: q.toUpperCase() }
        : { OR: [{ reference: { contains: q, mode: "insensitive" } }, { employeeName: { contains: q, mode: "insensitive" } }, { employeeEmail: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
    );
  }
  if (f.status && (STATUSES as string[]).includes(f.status)) and.push({ status: f.status as FacStatus });
  if (f.service === "MAINTENANCE" || f.service === "CLEANING") and.push({ service: f.service as FacService });
  if (f.priority && ["LOW", "MEDIUM", "HIGH", "EMERGENCY"].includes(f.priority)) and.push({ priority: f.priority as FacPriority });
  if (f.floor) and.push({ floorId: f.floor === "none" ? null : f.floor });
  if (f.team) and.push({ teamId: f.team === "none" ? null : f.team });
  if (f.category) and.push({ categoryId: f.category });
  if (f.open === "1" || f.overdue === "1") and.push({ status: { notIn: [...FINISHED] } });
  if (f.overdue === "1") and.push({ resolutionDueAt: { lt: new Date() } });
  return { AND: and };
}
