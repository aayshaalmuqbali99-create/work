import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireFacPage } from "@/features/facility/server/guard";
import { pickName } from "@/features/facility/format";
import { AREA_KINDS } from "@/features/facility/domain/location";
import { ActiveDot, ConfigTable } from "@/components/facility/ops/config-table";

export default async function RoutingPage() {
  await requireFacPage("config.manage");
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const [rules, teams, categories, floors] = await Promise.all([
    db.facRoutingRule.findMany({ orderBy: { sortOrder: "asc" }, include: { team: true, category: true } }),
    db.facTeam.findMany({ where: { active: true }, orderBy: { nameEn: "asc" } }),
    db.facCategory.findMany({ orderBy: [{ service: "asc" }, { sortOrder: "asc" }] }),
    db.facFloor.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const c = (k: string) => t(`Ops.config.${k}` as "Ops.config.code");
  const any = c("any");
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-fink">{c("routingTitle")}</h1>
      <ConfigTable
        entity="rule"
        help={c("routingHelp")}
        addLabel={c("addRule")}
        canMove
        canDelete
        columns={["#", t("Ops.table.service"), t("Ops.table.category"), t("Ops.table.floor"), c("kind"), t("Ops.table.team"), c("autoAssign"), ""]}
        fields={[
          { name: "service", label: t("Ops.table.service"), type: "select", nullable: true, options: (["MAINTENANCE", "CLEANING"] as const).map((s) => ({ value: s, label: t(`Service.${s}`) })) },
          { name: "categoryId", label: t("Ops.table.category"), type: "select", nullable: true, options: categories.map((x) => ({ value: x.id, label: `${t(`Service.${x.service}`)} · ${pickName(x, locale)}` })) },
          { name: "floorCode", label: t("Ops.table.floor"), type: "select", nullable: true, options: floors.map((f) => ({ value: f.code, label: f.code })) },
          { name: "areaKind", label: c("kind"), type: "select", nullable: true, options: AREA_KINDS.map((k) => ({ value: k, label: t(`AreaKind.${k}`) })) },
          { name: "teamId", label: t("Ops.table.team"), type: "select", options: teams.map((x) => ({ value: x.id, label: pickName(x, locale) + (x.kind === "CONTRACTOR" && !x.scopeConfirmed ? ` (${t("Ops.detail.unconfirmedScope")})` : "") })) },
          { name: "autoAssign", label: c("autoAssign"), type: "bool" },
          { name: "active", label: t("Common.active"), type: "bool" },
        ]}
        defaults={{ service: "", categoryId: "", floorCode: "", areaKind: "", teamId: teams[0]?.id ?? "", autoAssign: false, active: true, sortOrder: 999 }}
        rows={rules.map((r, i) => ({
          id: r.id, inactive: !r.active,
          values: { service: r.service ?? "", categoryId: r.categoryId ?? "", floorCode: r.floorCode ?? "", areaKind: r.areaKind ?? "", teamId: r.teamId, autoAssign: r.autoAssign, active: r.active, sortOrder: r.sortOrder },
          cells: [
            i + 1,
            r.service ? t(`Service.${r.service}`) : any,
            r.category ? pickName(r.category, locale) : any,
            r.floorCode ?? any,
            r.areaKind ? t(`AreaKind.${r.areaKind}` as "AreaKind.OTHER") : any,
            <strong key="t">{pickName(r.team, locale)}</strong>,
            r.autoAssign ? t("Common.yes") : t("Common.no"),
            <ActiveDot key="a" active={r.active} label={r.active ? t("Common.active") : t("Common.inactive")} />,
          ],
        }))}
      />
    </div>
  );
}
