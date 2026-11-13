import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireFacPage } from "@/features/facility/server/guard";
import { ActiveDot, ConfigTable } from "@/components/facility/ops/config-table";
import { SampleTag } from "@/components/facility/ui";

const SPECIALTIES = ["GENERAL", "HVAC", "ELECTRICAL", "PLUMBING", "CLEANING", "CIVIL", "ELEVATOR", "PEST", "PARKING"];

export default async function TeamsPage() {
  await requireFacPage("config.manage");
  const t = await getTranslations("Fac");
  const teams = await db.facTeam.findMany({ orderBy: [{ kind: "asc" }, { nameEn: "asc" }], include: { _count: { select: { members: true, requests: true } } } });
  const c = (k: string) => t(`Ops.config.${k}` as "Ops.config.code");
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-fink">{c("teamsTitle")}</h1>
      <ConfigTable
        entity="team"
        help={c("teamsHelp")}
        addLabel={c("addTeam")}
        columns={[t("Common.nameEn"), t("Common.nameAr"), c("teamKind"), c("specialty"), c("scopeConfirmed"), c("email"), ""]}
        fields={[
          { name: "nameEn", label: t("Common.nameEn"), type: "text", dir: "ltr" },
          { name: "nameAr", label: t("Common.nameAr"), type: "text", dir: "rtl" },
          { name: "kind", label: c("teamKind"), type: "select", options: [{ value: "INTERNAL", label: c("INTERNAL") }, { value: "CONTRACTOR", label: c("CONTRACTOR") }] },
          { name: "specialty", label: c("specialty"), type: "select", options: SPECIALTIES.map((s) => ({ value: s, label: s })) },
          { name: "email", label: c("email"), type: "email" },
          { name: "notes", label: c("notes"), type: "textarea", wide: true },
          { name: "scopeConfirmed", label: c("scopeConfirmed"), type: "bool" },
          { name: "active", label: t("Common.active"), type: "bool" },
        ]}
        defaults={{ nameEn: "", nameAr: "", kind: "INTERNAL", specialty: "GENERAL", email: "", notes: "", scopeConfirmed: true, active: true }}
        rows={teams.map((x) => ({
          id: x.id, inactive: !x.active,
          values: { nameEn: x.nameEn, nameAr: x.nameAr, kind: x.kind, specialty: x.specialty, email: x.email, notes: x.notes, scopeConfirmed: x.scopeConfirmed, active: x.active },
          cells: [
            <span key="n">{x.nameEn} {x.isSample && <SampleTag label={t("Common.sample")} />}</span>,
            x.nameAr,
            c(x.kind),
            x.specialty,
            x.kind === "CONTRACTOR" ? <ActiveDot key="s" active={x.scopeConfirmed} label={x.scopeConfirmed ? t("Common.yes") : t("Ops.detail.unconfirmedScope")} /> : "—",
            <span key="e" dir="ltr" className="text-xs">{x.email || "—"}</span>,
            <ActiveDot key="a" active={x.active} label={x.active ? t("Common.active") : t("Common.inactive")} />,
          ],
        }))}
      />
    </div>
  );
}
