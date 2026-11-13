import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getFacUser } from "@/features/facility/server/session";
import { can } from "@/features/facility/domain/permissions";
import { filtersToWhere } from "@/features/facility/server/filters";
import { facAudit } from "@/features/facility/server/audit";

const cell = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  // neutralise spreadsheet formulas and quote
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** CSV export of the filtered request list (same visibility rules as the table). */
export async function GET(req: NextRequest) {
  const user = await getFacUser();
  if (!user || !can(user.role, "ops.view")) return new Response("Forbidden", { status: 403 });
  const f = Object.fromEntries(req.nextUrl.searchParams);
  const rows = await db.facRequest.findMany({ where: filtersToWhere(user, f), orderBy: { createdAt: "desc" }, take: 10000, include: { category: true, issue: true, building: true, floor: true, wing: true, area: true, location: true, team: true } });
  const head = ["Reference", "Status", "Priority", "Service", "Category", "Problem", "Building", "Floor", "Wing", "Area", "Area type", "Specific location", "Location details", "Full location", "Employee", "Email", "Phone", "Department", "Team", "Team type", "Submitted", "Response due", "Resolution due", "First response", "Resolved", "Closed", "Rating", "Sample"];
  const lines = rows.map((r) =>
    [
      r.reference, r.status, r.priority, r.service, r.category?.nameEn, r.issue?.nameEn ?? r.issueOther, r.building?.nameEn, r.floor?.code, r.wing?.nameEn, r.area?.nameEn, r.area?.kind, r.location ? [r.location.nameEn, r.location.code].filter(Boolean).join(" ") : "", Object.entries((r.locationDetail ?? {}) as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join("; "), r.locationLabelEn,
      r.employeeName, r.employeeEmail, r.contactPhone, r.department, r.team?.nameEn, r.team?.kind, r.createdAt, r.responseDueAt, r.resolutionDueAt,
      r.firstResponseAt, r.resolvedAt, r.closedAt, r.rating, r.isSample ? "yes" : "",
    ].map(cell).join(","),
  );
  await facAudit(user, "request.export", "request", null, { count: rows.length });
  return new Response("﻿" + [head.map(cell).join(","), ...lines].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="facility-requests-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
