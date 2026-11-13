import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { requireFacPage } from "@/features/facility/server/guard";
import { emailTransport } from "@/features/facility/server/notify";
import { TEMPLATE_VARIABLES } from "@/features/facility/domain/template";
import { formatDate } from "@/features/facility/format";
import { ActiveDot, ConfigTable } from "@/components/facility/ops/config-table";
import { ProcessOutboxButton } from "@/components/facility/ops/small-actions";

export default async function EmailsPage() {
  await requireFacPage("config.manage");
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const [templates, outbox, counts] = await Promise.all([
    db.facEmailTemplate.findMany({ orderBy: { key: "asc" } }),
    db.facEmailOutbox.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    db.facEmailOutbox.groupBy({ by: ["status"], _count: true }),
  ]);
  const c = (k: string, v?: Record<string, string>) => t(`Ops.config.${k}` as "Ops.config.emailsHelp", v as { vars: string });
  const tpl = (k: string) => (t.has(`Ops.config.templates.${k}`) ? t(`Ops.config.templates.${k}` as "Ops.config.templates.SUBMITTED") : k);
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-fink">{t("Ops.nav.emails")}</h1>
      <ConfigTable
        entity="template"
        title={c("emailsTitle")}
        help={c("emailsHelp", { vars: TEMPLATE_VARIABLES.map((v) => `{{${v}}}`).join(" ") })}
        canAdd={false}
        columns={[c("emailsTitle"), c("subjectEn"), c("subjectAr"), ""]}
        fields={[
          { name: "subjectEn", label: c("subjectEn"), type: "text", dir: "ltr" },
          { name: "subjectAr", label: c("subjectAr"), type: "text", dir: "rtl" },
          { name: "active", label: t("Common.active"), type: "bool" },
          { name: "bodyEn", label: c("bodyEn"), type: "textarea", dir: "ltr", wide: true },
          { name: "bodyAr", label: c("bodyAr"), type: "textarea", dir: "rtl", wide: true },
        ]}
        defaults={{}}
        rows={templates.map((x) => ({
          id: x.id, inactive: !x.active,
          values: { subjectEn: x.subjectEn, subjectAr: x.subjectAr, bodyEn: x.bodyEn, bodyAr: x.bodyAr, active: x.active },
          cells: [<strong key="k">{tpl(x.key)}</strong>, <span key="e" dir="ltr">{x.subjectEn}</span>, <span key="a" dir="rtl">{x.subjectAr}</span>, <ActiveDot key="s" active={x.active} label={x.active ? t("Common.active") : t("Common.inactive")} />],
        }))}
      />
      <section className="rounded-[22px] border border-fline bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fline px-5 py-4">
          <div>
            <h2 className="font-extrabold text-fink">{c("outbox")}</h2>
            <p className="text-sm text-fmuted">{c("transport", { transport: emailTransport() === "graph" ? "Microsoft Graph" : "log (development — not delivered)" })} · {counts.map((x) => `${c(x.status)}: ${x._count}`).join(" · ")}</p>
          </div>
          <ProcessOutboxButton />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs font-bold uppercase tracking-wide text-fmuted">
              <tr>{[t("Ops.config.when"), c("to"), c("subjectEn"), t("Ops.table.status"), c("attempts")].map((h) => <th key={h} className="px-4 py-3 text-start">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-fline">
              {outbox.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-fmuted">{formatDate(m.createdAt, locale, true)}</td>
                  <td className="px-4 py-3" dir="ltr">{m.to}</td>
                  <td className="max-w-md truncate px-4 py-3">{m.subject}</td>
                  <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", m.status === "SENT" ? "bg-[#E8F9EF] text-[#1B6B3E]" : m.status === "FAILED" ? "bg-red-50 text-red-700" : "bg-lav-50 text-deep")} title={m.lastError ?? ""}>{c(m.status)}</span></td>
                  <td className="px-4 py-3">{m.attempts}</td>
                </tr>
              ))}
              {outbox.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-fmuted">—</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
