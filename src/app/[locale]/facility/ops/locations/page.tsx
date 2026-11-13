import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireFacPage } from "@/features/facility/server/guard";
import { pickName } from "@/features/facility/format";
import { AREA_KINDS, LOCATION_FIELDS } from "@/features/facility/domain/location";
import { ActiveDot, ConfigTable } from "@/components/facility/ops/config-table";
import { AreaIcon } from "@/components/facility/icons";

export default async function LocationsPage() {
  await requireFacPage("config.manage");
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const buildings = await db.facBuilding.findMany({
    orderBy: { sortOrder: "asc" },
    include: { wings: { orderBy: { sortOrder: "asc" } }, floors: { orderBy: { sortOrder: "asc" }, include: { wing: true, areas: { orderBy: { sortOrder: "asc" } } } } },
  });
  const c = (k: string) => t(`Ops.config.${k}` as "Ops.config.code");
  const act = (a: boolean) => <ActiveDot active={a} label={a ? t("Common.active") : t("Common.inactive")} />;
  const names = [
    { name: "nameEn", label: t("Common.nameEn"), type: "text" as const, dir: "ltr" as const },
    { name: "nameAr", label: t("Common.nameAr"), type: "text" as const, dir: "rtl" as const },
  ];
  const kinds = [...new Set([...AREA_KINDS, ...buildings.flatMap((b) => b.floors.flatMap((f) => f.areas.map((a) => a.kind)))])];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-fink">{c("locationsTitle")}</h1>
        <p className="mt-2 max-w-3xl text-fmuted">{c("locationsHelp")}</p>
      </div>
      <ConfigTable
        entity="building"
        title={c("buildings")}
        addLabel={c("addBuilding")}
        canMove
        columns={[c("code"), t("Common.nameEn"), t("Common.nameAr"), ""]}
        fields={[{ name: "code", label: c("code"), type: "text", dir: "ltr" }, ...names, { name: "active", label: t("Common.active"), type: "bool" }]}
        defaults={{ code: "", nameEn: "", nameAr: "", active: true, sortOrder: 999 }}
        rows={buildings.map((b) => ({ id: b.id, inactive: !b.active, values: { code: b.code, nameEn: b.nameEn, nameAr: b.nameAr, active: b.active, sortOrder: b.sortOrder }, cells: [<span key="c" className="font-mono font-bold">{b.code}</span>, b.nameEn, b.nameAr, act(b.active)] }))}
      />
      {buildings.map((b) => (
        <div key={b.id} className="space-y-6">
          <ConfigTable
            entity="wing"
            title={`${c("wings")} · ${pickName(b, locale)}`}
            addLabel={c("addWing")}
            canMove
            fixed={{ buildingId: b.id }}
            columns={[c("code"), t("Common.nameEn"), t("Common.nameAr"), ""]}
            fields={[{ name: "code", label: c("code"), type: "text", dir: "ltr" }, ...names, { name: "active", label: t("Common.active"), type: "bool" }]}
            defaults={{ code: "", nameEn: "", nameAr: "", active: true, sortOrder: 999 }}
            rows={b.wings.map((w) => ({ id: w.id, inactive: !w.active, values: { code: w.code, nameEn: w.nameEn, nameAr: w.nameAr, active: w.active, sortOrder: w.sortOrder }, cells: [<span key="c" className="font-mono font-bold">{w.code}</span>, w.nameEn, w.nameAr, act(w.active)] }))}
          />
          <ConfigTable
            entity="floor"
            title={`${c("floors")} · ${pickName(b, locale)}`}
            addLabel={c("addFloor")}
            canMove
            fixed={{ buildingId: b.id }}
            columns={[c("code"), t("Common.nameEn"), t("Common.nameAr"), t("Wizard.wing"), c("level"), c("areas"), ""]}
            fields={[
              { name: "code", label: c("code"), type: "text", dir: "ltr" }, ...names,
              { name: "wingId", label: t("Wizard.wing"), type: "select", nullable: true, options: b.wings.map((w) => ({ value: w.id, label: pickName(w, locale) })), help: c("noWing") },
              { name: "level", label: c("level"), type: "number" },
              { name: "active", label: t("Common.active"), type: "bool" },
            ]}
            defaults={{ code: "", nameEn: "", nameAr: "", wingId: "", level: 0, active: true, sortOrder: 999 }}
            rows={b.floors.map((f) => ({
              id: f.id, inactive: !f.active,
              values: { code: f.code, nameEn: f.nameEn, nameAr: f.nameAr, wingId: f.wingId ?? "", level: f.level, active: f.active, sortOrder: f.sortOrder },
              cells: [<span key="c" className="font-mono font-bold">{f.code}</span>, f.nameEn, f.nameAr, f.wing ? pickName(f.wing, locale) : c("noWing"), f.level, f.areas.length, act(f.active)],
            }))}
          />
          {b.floors.map((f) => (
            <ConfigTable
              key={f.id}
              entity="area"
              title={`${c("areas")} · ${f.code}`}
              addLabel={c("addArea")}
              canMove
              fixed={{ floorId: f.id }}
              columns={[c("kind"), t("Common.nameEn"), t("Common.nameAr"), c("fields"), ""]}
              fields={[
                { name: "kind", label: c("kind"), type: "select", options: kinds.map((k) => ({ value: k, label: t.has(`AreaKind.${k}`) ? t(`AreaKind.${k}` as "AreaKind.OTHER") : k })) },
                ...names,
                { name: "parentId", label: c("parent"), type: "select", nullable: true, options: f.areas.map((a) => ({ value: a.id, label: pickName(a, locale) })) },
                { name: "fields", label: c("fields"), type: "multi", wide: true, options: LOCATION_FIELDS.map((x) => ({ value: x, label: t(`Fields.${x}`) })) },
                { name: "descEn", label: c("descEn"), type: "text", dir: "ltr" },
                { name: "descAr", label: c("descAr"), type: "text", dir: "rtl" },
                { name: "scopeNoteEn", label: c("scopeNoteEn"), type: "textarea", dir: "ltr" },
                { name: "scopeNoteAr", label: c("scopeNoteAr"), type: "textarea", dir: "rtl" },
                { name: "isOther", label: c("isOther"), type: "bool" },
                { name: "active", label: t("Common.active"), type: "bool" },
              ]}
              defaults={{ kind: "OTHER", nameEn: "", nameAr: "", parentId: "", fields: [], descEn: "", descAr: "", scopeNoteEn: "", scopeNoteAr: "", isOther: false, active: true, sortOrder: 999 }}
              rows={f.areas.map((a) => ({
                id: a.id, inactive: !a.active,
                values: { kind: a.kind, nameEn: a.nameEn, nameAr: a.nameAr, parentId: a.parentId ?? "", fields: a.fields, descEn: a.descEn, descAr: a.descAr, scopeNoteEn: a.scopeNoteEn, scopeNoteAr: a.scopeNoteAr, isOther: a.isOther, active: a.active, sortOrder: a.sortOrder },
                cells: [
                  <span key="k" className="inline-flex items-center gap-2"><AreaIcon kind={a.kind} className="size-4 text-deep" />{t.has(`AreaKind.${a.kind}`) ? t(`AreaKind.${a.kind}` as "AreaKind.OTHER") : a.kind}</span>,
                  a.nameEn, a.nameAr,
                  <span key="f" className="text-xs text-fmuted">{a.fields.map((x) => t(`Fields.${x}` as "Fields.room")).join(", ") || "—"}</span>,
                  act(a.active),
                ],
              }))}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
