import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { requireFacPage } from "@/features/facility/server/guard";
import { AREA_KINDS } from "@/features/facility/domain/location";
import { ActiveDot, ConfigTable } from "@/components/facility/ops/config-table";
import { CategoryIcon, ICON_NAMES } from "@/components/facility/icons";
import { pickName } from "@/features/facility/format";

export default async function CategoriesPage() {
  await requireFacPage("config.manage");
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const categories = await db.facCategory.findMany({ orderBy: [{ service: "asc" }, { sortOrder: "asc" }], include: { issues: { orderBy: { sortOrder: "asc" } } } });
  const areaKinds = [...new Set([...AREA_KINDS, ...(await db.facArea.findMany({ select: { kind: true }, distinct: ["kind"] })).map((a) => a.kind)])];
  const c = (k: string) => t(`Ops.config.${k}` as "Ops.config.code");
  const act = (a: boolean) => <ActiveDot active={a} label={a ? t("Common.active") : t("Common.inactive")} />;
  const kindLabel = (k: string) => (t.has(`AreaKind.${k}`) ? t(`AreaKind.${k}` as "AreaKind.OTHER") : k);
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-fink">{c("categoriesTitle")}</h1>
        <p className="mt-2 max-w-3xl text-fmuted">{c("categoriesHelp")}</p>
      </div>
      <ConfigTable
        entity="category"
        title={c("categoriesTitle")}
        addLabel={c("addCategory")}
        canMove
        columns={[t("Ops.table.service"), t("Common.nameEn"), t("Common.nameAr"), c("issues"), ""]}
        fields={[
          { name: "service", label: t("Ops.table.service"), type: "select", options: (["MAINTENANCE", "CLEANING"] as const).map((s) => ({ value: s, label: t(`Service.${s}`) })) },
          { name: "key", label: c("code"), type: "text", dir: "ltr" },
          { name: "nameEn", label: t("Common.nameEn"), type: "text", dir: "ltr" },
          { name: "nameAr", label: t("Common.nameAr"), type: "text", dir: "rtl" },
          { name: "icon", label: c("icon"), type: "select", options: ICON_NAMES.map((i) => ({ value: i, label: i })) },
          { name: "active", label: t("Common.active"), type: "bool" },
        ]}
        defaults={{ service: "MAINTENANCE", key: "", nameEn: "", nameAr: "", icon: "wrench", active: true, sortOrder: 999 }}
        rows={categories.map((x) => ({
          id: x.id, inactive: !x.active,
          values: { service: x.service, key: x.key, nameEn: x.nameEn, nameAr: x.nameAr, icon: x.icon, active: x.active, sortOrder: x.sortOrder },
          cells: [t(`Service.${x.service}`), <span key="n" className="inline-flex items-center gap-2"><CategoryIcon name={x.icon} className="size-4 text-deep" />{x.nameEn}</span>, x.nameAr, x.issues.length, act(x.active)],
        }))}
      />
      {categories.map((cat) => (
        <ConfigTable
          key={cat.id}
          entity="issue"
          title={`${t(`Service.${cat.service}`)} · ${pickName(cat, locale)}`}
          addLabel={c("addIssue")}
          canMove
          fixed={{ categoryId: cat.id }}
          columns={[t("Common.nameEn"), t("Common.nameAr"), c("areaKinds"), c("defaultPriority"), ""]}
          fields={[
            { name: "nameEn", label: t("Common.nameEn"), type: "text", dir: "ltr" },
            { name: "nameAr", label: t("Common.nameAr"), type: "text", dir: "rtl" },
            { name: "defaultPriority", label: c("defaultPriority"), type: "select", options: (["LOW", "MEDIUM", "HIGH", "EMERGENCY"] as const).map((p) => ({ value: p, label: t(`Priority.${p}`) })) },
            { name: "areaKinds", label: c("areaKinds"), type: "multi", wide: true, options: areaKinds.map((k) => ({ value: k, label: kindLabel(k) })) },
            { name: "floorCodes", label: c("floorCodes"), type: "tags" },
            { name: "safetyRisk", label: c("safetyRisk"), type: "bool" },
            { name: "active", label: t("Common.active"), type: "bool" },
          ]}
          defaults={{ nameEn: "", nameAr: "", defaultPriority: "MEDIUM", areaKinds: [], floorCodes: [], safetyRisk: false, active: true, sortOrder: 999 }}
          rows={cat.issues.map((i) => ({
            id: i.id, inactive: !i.active,
            values: { nameEn: i.nameEn, nameAr: i.nameAr, defaultPriority: i.defaultPriority, areaKinds: i.areaKinds, floorCodes: i.floorCodes, safetyRisk: i.safetyRisk, active: i.active, sortOrder: i.sortOrder },
            cells: [
              <span key="n" className="inline-flex items-center gap-1.5">{i.nameEn}{i.safetyRisk && <AlertTriangle className="size-3.5 text-gold" aria-label={c("safetyRisk")} />}</span>,
              i.nameAr,
              <span key="k" className="text-xs text-fmuted">{(i.areaKinds.length ? i.areaKinds.map(kindLabel).join(", ") : t("Common.all")) + (i.floorCodes.length ? ` · ${i.floorCodes.join(", ")}` : "")}</span>,
              t(`Priority.${i.defaultPriority}`),
              act(i.active),
            ],
          }))}
        />
      ))}
    </div>
  );
}
