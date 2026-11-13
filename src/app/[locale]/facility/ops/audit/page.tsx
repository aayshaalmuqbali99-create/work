import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireFacPage } from "@/features/facility/server/guard";
import { formatDate } from "@/features/facility/format";

export default async function AuditPage() {
  await requireFacPage("config.manage");
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const rows = await db.facAudit.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const c = (k: string) => t(`Ops.config.${k}` as "Ops.config.code");
  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-3xl font-extrabold tracking-tight text-fink">{c("auditTitle")}</h1>
      <div className="mt-6 overflow-x-auto rounded-[22px] border border-fline bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-lav-50/70 text-xs font-bold uppercase tracking-wide text-fmuted">
            <tr>{[c("when"), c("who"), c("action"), c("entity"), "IP"].map((h) => <th key={h} className="px-4 py-3 text-start">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-fline">
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-fmuted">{formatDate(r.createdAt, locale, true)}</td>
                <td className="px-4 py-3 font-semibold">{r.userName}</td>
                <td className="px-4 py-3 font-mono text-xs" dir="ltr">{r.action}</td>
                <td className="px-4 py-3 text-xs" dir="ltr">{r.entity}{r.entityId ? ` · ${r.entityId.slice(0, 10)}…` : ""}{r.data ? <code className="mt-1 block max-w-md truncate text-fmuted">{JSON.stringify(r.data)}</code> : null}</td>
                <td className="px-4 py-3 text-xs text-fmuted" dir="ltr">{r.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
