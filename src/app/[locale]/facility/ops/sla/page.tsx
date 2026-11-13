import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireFacPage } from "@/features/facility/server/guard";
import { getSettings } from "@/features/facility/server/calendar";
import { formatDate, durationLabel } from "@/features/facility/format";
import { ConfigTable, EditForm } from "@/components/facility/ops/config-table";
import { SampleTag } from "@/components/facility/ui";

const ORDER = ["EMERGENCY", "HIGH", "MEDIUM", "LOW"] as const;

export default async function SlaPage() {
  await requireFacPage("config.manage");
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const [policies, settings, holidays] = await Promise.all([db.facSlaPolicy.findMany(), getSettings(), db.facHoliday.findMany({ orderBy: { date: "asc" } })]);
  const c = (k: string) => t(`Ops.config.${k}` as "Ops.config.code");
  const sorted = ORDER.map((p) => policies.find((x) => x.priority === p)).filter((x): x is NonNullable<typeof x> => !!x);
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-fink">{t("Ops.nav.sla")}</h1>
      <ConfigTable
        entity="sla"
        title={c("slaTitle")}
        help={c("slaHelp")}
        canAdd={false}
        columns={[t("Detail.priority"), c("response"), c("resolution"), c("businessHours")]}
        fields={[
          { name: "responseMinutes", label: c("response"), type: "number", nullable: true },
          { name: "resolutionMinutes", label: c("resolution"), type: "number", nullable: true },
          { name: "businessHoursOnly", label: c("businessHours"), type: "bool" },
        ]}
        defaults={{}}
        rows={sorted.map((p) => ({
          id: p.id,
          values: { responseMinutes: p.responseMinutes ?? "", resolutionMinutes: p.resolutionMinutes ?? "", businessHoursOnly: p.businessHoursOnly },
          cells: [
            <span key="p" className="font-semibold">{t(`Priority.${p.priority}`)} {p.isSample && <SampleTag label={t("Common.sample")} />}</span>,
            p.responseMinutes ? durationLabel(p.responseMinutes, locale) : t("Common.notSet"),
            p.resolutionMinutes ? durationLabel(p.resolutionMinutes, locale) : t("Common.notSet"),
            p.businessHoursOnly ? t("Common.yes") : t("Common.no"),
          ],
        }))}
      />
      <section className="rounded-[22px] border border-fline bg-white">
        <h2 className="border-b border-fline px-5 py-4 font-extrabold text-fink">{c("calendar")}</h2>
        <EditForm
          entity="settings"
          id={null}
          values={{
            timezone: settings.timezone, workStart: settings.workStart, workEnd: settings.workEnd, workDays: settings.workDays, reopenDays: settings.reopenDays,
            escalationEmails: settings.escalationEmails, emergencyContactEn: settings.emergencyContactEn, emergencyContactAr: settings.emergencyContactAr,
          }}
          fields={[
            { name: "timezone", label: c("timezone"), type: "text", dir: "ltr" },
            { name: "workStart", label: c("workStart"), type: "time" },
            { name: "workEnd", label: c("workEnd"), type: "time" },
            { name: "workDays", label: c("workDays"), type: "days", wide: true },
            { name: "reopenDays", label: c("reopenDays"), type: "number" },
            { name: "escalationEmails", label: c("escalationEmails"), type: "text", dir: "ltr", wide: true },
            { name: "emergencyContactEn", label: c("emergencyEn"), type: "text", dir: "ltr", help: c("emergencyHelp") },
            { name: "emergencyContactAr", label: c("emergencyAr"), type: "text", dir: "rtl", help: c("emergencyHelp") },
          ]}
        />
      </section>
      <ConfigTable
        entity="holiday"
        title={c("holidays")}
        addLabel={c("addHoliday")}
        canDelete
        columns={[c("date"), t("Common.nameEn"), t("Common.nameAr")]}
        fields={[
          { name: "date", label: c("date"), type: "date" },
          { name: "nameEn", label: t("Common.nameEn"), type: "text", dir: "ltr" },
          { name: "nameAr", label: t("Common.nameAr"), type: "text", dir: "rtl" },
        ]}
        defaults={{ date: "", nameEn: "", nameAr: "" }}
        rows={holidays.map((h) => ({ id: h.id, values: { date: h.date.toISOString().slice(0, 10), nameEn: h.nameEn, nameAr: h.nameAr }, cells: [formatDate(h.date, locale), h.nameEn, h.nameAr] }))}
      />
    </div>
  );
}
