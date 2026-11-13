import "server-only";
import type { FacStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { FINISHED } from "../domain/status";

export type Range = "30" | "90" | "365" | "all";
const since = (r: Range) => (r === "all" ? undefined : new Date(Date.now() - Number(r) * 864e5));

/** KPI counts for the dashboard (live values). */
export async function getKpis(where: Prisma.FacRequestWhereInput = {}) {
  const now = new Date();
  const [byStatus, overdue, emergency, total] = await Promise.all([
    db.facRequest.groupBy({ by: ["status"], where, _count: true }),
    db.facRequest.count({ where: { ...where, status: { notIn: [...FINISHED] }, resolutionDueAt: { lt: now } } }),
    db.facRequest.count({ where: { ...where, status: { notIn: [...FINISHED] }, priority: "EMERGENCY" } }),
    db.facRequest.count({ where }),
  ]);
  const s = Object.fromEntries(byStatus.map((x) => [x.status, x._count])) as Partial<Record<FacStatus, number>>;
  return { total, s, overdue, emergency, newCount: (s.SUBMITTED ?? 0) + (s.REOPENED ?? 0) };
}

/** All analytics in one pass over the period's requests (fine for tens of thousands of rows). */
export async function getAnalytics(range: Range) {
  const from = since(range);
  const rows = await db.facRequest.findMany({
    where: from ? { createdAt: { gte: from } } : {},
    select: {
      id: true, service: true, status: true, createdAt: true, resolvedAt: true, resolutionDueAt: true, issueId: true, areaId: true, issueOther: true,
      floor: { select: { code: true, nameEn: true, nameAr: true, sortOrder: true } },
      category: { select: { id: true, nameEn: true, nameAr: true } },
      team: { select: { id: true, nameEn: true, nameAr: true, kind: true } },
      issue: { select: { nameEn: true, nameAr: true } },
      area: { select: { nameEn: true, nameAr: true } },
    },
  });
  const count = <K extends string>(fn: (r: (typeof rows)[number]) => K | null) => {
    const m = new Map<K, number>();
    for (const r of rows) {
      const k = fn(r);
      if (k !== null) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const named = new Map<string, { nameEn: string; nameAr: string }>();
  const byFloor = count((r) => (r.floor ? (named.set(`f:${r.floor.code}`, r.floor), `f:${r.floor.code}`) : "f:?"));
  const byCategory = count((r) => (r.category ? (named.set(`c:${r.category.id}`, r.category), `c:${r.category.id}`) : "c:?"));
  const byTeam = count((r) => (r.team ? (named.set(`t:${r.team.id}`, r.team), `t:${r.team.id}`) : "t:?"));
  const byService = count((r) => r.service);

  const resolved = rows.filter((r) => r.resolvedAt);
  const avgResolutionMin = resolved.length ? resolved.reduce((a, r) => a + (r.resolvedAt!.getTime() - r.createdAt.getTime()), 0) / resolved.length / 60_000 : null;
  const withTarget = resolved.filter((r) => r.resolutionDueAt);
  const met = withTarget.filter((r) => r.resolvedAt! <= r.resolutionDueAt!).length;

  // recurring: same issue at same area, 2+ times
  const rec = new Map<string, { n: number; label: { en: string; ar: string } }>();
  for (const r of rows) {
    if (!r.areaId) continue;
    const k = `${r.areaId}|${r.issueId ?? r.issueOther.toLowerCase()}`;
    const cur = rec.get(k) ?? {
      n: 0,
      label: {
        en: `${r.issue?.nameEn ?? r.issueOther} · ${r.floor?.code ?? ""} ${r.area?.nameEn ?? ""}`.trim(),
        ar: `${r.issue?.nameAr ?? r.issueOther} · ${r.floor?.code ?? ""} ${r.area?.nameAr ?? ""}`.trim(),
      },
    };
    cur.n++;
    rec.set(k, cur);
  }
  const recurring = [...rec.values()].filter((x) => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 10);

  // monthly trend (last 12 months or period)
  const months: { key: string; created: number; resolved: number }[] = [];
  const start = new Date();
  start.setUTCDate(1);
  const n = range === "30" ? 2 : range === "90" ? 4 : 12;
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - i, 1));
    months.push({ key: d.toISOString().slice(0, 7), created: 0, resolved: 0 });
  }
  for (const r of rows) {
    const c = months.find((m) => m.key === r.createdAt.toISOString().slice(0, 7));
    if (c) c.created++;
    if (r.resolvedAt) {
      const m = months.find((x) => x.key === r.resolvedAt!.toISOString().slice(0, 7));
      if (m) m.resolved++;
    }
  }

  const label = (key: string) => named.get(key) ?? null;
  return {
    total: rows.length,
    byFloor: [...byFloor].map(([k, v]) => ({ key: k, label: label(k), value: v })).sort((a, b) => b.value - a.value),
    byCategory: [...byCategory].map(([k, v]) => ({ key: k, label: label(k), value: v })).sort((a, b) => b.value - a.value),
    byTeam: [...byTeam].map(([k, v]) => ({ key: k, label: label(k), value: v })).sort((a, b) => b.value - a.value),
    basements: ["B1", "B2", "B3"].map((c) => ({ key: c, value: byFloor.get(`f:${c}`) ?? 0 })),
    service: { MAINTENANCE: byService.get("MAINTENANCE") ?? 0, CLEANING: byService.get("CLEANING") ?? 0 },
    avgResolutionMin,
    resolvedCount: resolved.length,
    sla: { withTarget: withTarget.length, met, pct: withTarget.length ? Math.round((met / withTarget.length) * 100) : null },
    recurring,
    months,
  };
}
export type Analytics = Awaited<ReturnType<typeof getAnalytics>>;
