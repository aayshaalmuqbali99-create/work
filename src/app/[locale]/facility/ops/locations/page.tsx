import { getLocale, getTranslations } from "next-intl/server";
import { Eye, Moon, Sun } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { requireFacPage } from "@/features/facility/server/guard";
import { pickName } from "@/features/facility/format";
import { LOCATION_FIELDS, LOCATION_KINDS } from "@/features/facility/domain/location";
import { ActiveDot, ConfigTable, VerificationBadge } from "@/components/facility/ops/config-table";
import { ArchiveButton } from "@/components/facility/ops/archive-button";
import { AreaIcon, LOCATION_ICONS } from "@/components/facility/icons";
import { fhBtn } from "@/components/facility/ui";

/**
 * Building & Location Management: buildings, wings, the area category library, floors (with their wings),
 * and — per floor — areas and specific locations. Everything is data; no code changes needed.
 */
export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ floor?: string; archived?: string }> }) {
  await requireFacPage("config.manage");
  const sp = await searchParams;
  const showArchived = sp.archived === "1";
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const notArchived = showArchived ? {} : { archivedAt: null };
  const [buildings, categories] = await Promise.all([
    db.facBuilding.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        wings: { where: notArchived, orderBy: { sortOrder: "asc" } },
        floors: {
          where: notArchived,
          orderBy: { sortOrder: "asc" },
          include: {
            wingLinks: { include: { wing: true }, orderBy: { sortOrder: "asc" } },
            areas: { where: notArchived, orderBy: { sortOrder: "asc" }, include: { wing: true, category: true, _count: { select: { requests: true } } } },
            locations: { where: notArchived, orderBy: [{ kind: "asc" }, { sortOrder: "asc" }], include: { area: true, wing: true } },
            _count: { select: { requests: true } },
          },
        },
      },
    }),
    db.facAreaCategory.findMany({ where: notArchived, orderBy: { sortOrder: "asc" }, include: { _count: { select: { areas: true } } } }),
  ]);
  const archivedCount =
    (await db.facFloor.count({ where: { archivedAt: { not: null } } })) +
    (await db.facArea.count({ where: { archivedAt: { not: null } } })) +
    (await db.facLocation.count({ where: { archivedAt: { not: null } } })) +
    (await db.facWing.count({ where: { archivedAt: { not: null } } })) +
    (await db.facAreaCategory.count({ where: { archivedAt: { not: null } } }));
  const allFloors = buildings.flatMap((b) => b.floors.map((f) => ({ ...f, building: b })));
  const selected = allFloors.find((f) => f.id === sp.floor) ?? allFloors[0] ?? null;
  const provisionalFloors = allFloors.filter((f) => f.verification === "PROVISIONAL" && !f.archivedAt).length;

  const c = (k: string) => t(`Ops.config.${k}` as "Ops.config.code");
  const act = (a: boolean) => <ActiveDot active={a} label={a ? t("Common.active") : t("Common.inactive")} />;
  const ver = (v: string) => <VerificationBadge provisional={v === "PROVISIONAL"} label={c(v)} />;
  const archivedTag = (d: Date | null) => (d ? <span className="ms-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-bold text-zinc-600">{c("archive")}</span> : null);
  const names = [
    { name: "nameEn", label: t("Common.nameEn"), type: "text" as const, dir: "ltr" as const },
    { name: "nameAr", label: t("Common.nameAr"), type: "text" as const, dir: "rtl" as const },
  ];
  const verificationField = { name: "verification", label: c("verification"), type: "select" as const, options: [{ value: "CONFIRMED", label: c("CONFIRMED") }, { value: "PROVISIONAL", label: c("PROVISIONAL") }] };
  const kindLabel = (k: string) => {
    const cat = categories.find((x) => x.key === k);
    return cat ? pickName(cat, locale) : k;
  };
  const fieldOptions = LOCATION_FIELDS.map((x) => ({ value: x, label: t(`Fields.${x}`) }));
  const floorHref = (id: string) => `/facility/ops/locations?floor=${id}${showArchived ? "&archived=1" : ""}`;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-fink">{c("locationsTitle")}</h1>
          <p className="mt-2 max-w-3xl text-fmuted">{c("locationsHelp")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={showArchived ? "/facility/ops/locations" : "/facility/ops/locations?archived=1"} className={fhBtn.ghost}>
            {c("archivedCount").replace("{count}", String(archivedCount))}
            {showArchived && " ✓"}
          </Link>
          <Link href="/facility/ops/locations/preview" className={fhBtn.secondary}><Eye className="size-4" aria-hidden="true" /> {c("preview")}</Link>
        </div>
      </div>
      {provisionalFloors > 0 && (
        <p className="rounded-2xl border border-[#FFE59A] bg-[#FFF8E0] px-4 py-3 text-sm text-[#5C4400]">{t("Ops.config.provisionalBanner", { count: provisionalFloors })}</p>
      )}

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
        <div key={b.id} className="space-y-8">
          <ConfigTable
            entity="wing"
            title={`${c("wings")} · ${pickName(b, locale)}`}
            addLabel={c("addWing")}
            canMove
            fixed={{ buildingId: b.id }}
            columns={[c("code"), t("Common.nameEn"), t("Common.nameAr"), c("verification"), ""]}
            fields={[{ name: "code", label: c("code"), type: "text", dir: "ltr" }, ...names, verificationField, { name: "active", label: t("Common.active"), type: "bool" }]}
            defaults={{ code: "", nameEn: "", nameAr: "", verification: "CONFIRMED", active: true, sortOrder: 999 }}
            rows={b.wings.map((w) => ({
              id: w.id, inactive: !w.active || !!w.archivedAt,
              values: { code: w.code, nameEn: w.nameEn, nameAr: w.nameAr, verification: w.verification, active: w.active, sortOrder: w.sortOrder },
              cells: [<span key="c" className="inline-flex items-center gap-1.5 font-mono font-bold">{w.code === "SUN" ? <Sun className="size-4 text-gold" /> : w.code === "MOON" ? <Moon className="size-4 text-deep" /> : null}{w.code}{archivedTag(w.archivedAt)}</span>, w.nameEn, w.nameAr, ver(w.verification), act(w.active)],
              extra: <ArchiveButton entity="wing" id={w.id} archived={!!w.archivedAt} />,
            }))}
          />

          <ConfigTable
            entity="floor"
            title={`${c("floors")} · ${pickName(b, locale)}`}
            addLabel={c("addFloor")}
            canMove
            fixed={{ buildingId: b.id }}
            columns={[c("code"), t("Common.nameEn"), t("Common.nameAr"), c("wingsOnFloor"), c("areas"), c("verification"), ""]}
            fields={[
              { name: "code", label: c("code"), type: "text", dir: "ltr" }, ...names,
              { name: "level", label: c("level"), type: "number", help: "B1 = -1 · G = 0" },
              { name: "wingIds", label: c("wingsOnFloor"), type: "multi", wide: true, options: b.wings.filter((w) => !w.archivedAt).map((w) => ({ value: w.id, label: pickName(w, locale) })) },
              verificationField,
              { name: "active", label: t("Common.active"), type: "bool" },
            ]}
            defaults={{ code: "", nameEn: "", nameAr: "", level: 0, wingIds: [], verification: "CONFIRMED", active: true, sortOrder: 999 }}
            rows={b.floors.map((f) => ({
              id: f.id, inactive: !f.active || !!f.archivedAt,
              values: { code: f.code, nameEn: f.nameEn, nameAr: f.nameAr, level: f.level, wingIds: f.wingLinks.map((l) => l.wingId), verification: f.verification, active: f.active, sortOrder: f.sortOrder },
              cells: [
                <Link key="c" href={floorHref(f.id)} className="font-mono font-bold text-deep hover:underline" dir="ltr">{f.code}{archivedTag(f.archivedAt)}</Link>,
                f.nameEn, f.nameAr,
                f.wingLinks.length ? <span key="w" className="text-xs">{f.wingLinks.map((l) => pickName(l.wing, locale)).join(" · ")}</span> : <span key="w" className="text-xs text-fmuted">—</span>,
                f.areas.length,
                ver(f.verification),
                act(f.active),
              ],
              extra: <ArchiveButton entity="floor" id={f.id} archived={!!f.archivedAt} />,
            }))}
          />
        </div>
      ))}

      {/* ---- per floor: areas and specific locations ---- */}
      {selected && (
        <section className="space-y-6 rounded-[28px] border border-lav-200 bg-lav-50/50 p-4 sm:p-6" aria-labelledby="floor-detail">
          <div>
            <p id="floor-detail" className="mb-3 text-sm font-semibold text-fmuted">{c("floorTabs")}</p>
            <nav className="flex flex-wrap gap-2" aria-label={c("floors")}>
              {allFloors.map((f) => (
                <Link
                  key={f.id}
                  href={floorHref(f.id)}
                  aria-current={f.id === selected.id ? "page" : undefined}
                  className={cn(
                    "relative rounded-2xl border-2 px-3.5 py-2 text-start transition",
                    f.id === selected.id ? "border-deep bg-white shadow-soft" : "border-transparent bg-white/70 hover:border-lav-200",
                  )}
                >
                  <span className="block font-mono text-lg font-extrabold text-deep" dir="ltr">{f.code}</span>
                  <span className="block text-[11px] text-fmuted">{f.areas.length} · {f.verification === "PROVISIONAL" ? c("PROVISIONAL") : c("CONFIRMED")}</span>
                </Link>
              ))}
            </nav>
          </div>

          <ConfigTable
            key={`areas-${selected.id}`}
            entity="area"
            title={`${c("areas")} · ${selected.code} · ${pickName(selected, locale)}`}
            addLabel={c("addArea")}
            canMove
            fixed={{ floorId: selected.id }}
            columns={[c("kind"), t("Common.nameEn"), t("Common.nameAr"), c("wingOfArea"), c("fields"), c("verification"), ""]}
            fields={[
              { name: "kind", label: c("kind"), type: "select", options: categories.filter((x) => !x.archivedAt).map((x) => ({ value: x.key, label: pickName(x, locale) })) },
              ...names,
              { name: "wingId", label: c("wingOfArea"), type: "select", nullable: true, options: selected.wingLinks.map((l) => ({ value: l.wingId, label: pickName(l.wing, locale) })), help: c("sharedAllWings") },
              { name: "parentId", label: c("parent"), type: "select", nullable: true, options: selected.areas.map((a) => ({ value: a.id, label: pickName(a, locale) })) },
              { name: "fields", label: c("fields"), type: "multi", wide: true, options: fieldOptions },
              { name: "descEn", label: c("descEn"), type: "text", dir: "ltr" },
              { name: "descAr", label: c("descAr"), type: "text", dir: "rtl" },
              verificationField,
              { name: "scopeNoteEn", label: c("scopeNoteEn"), type: "textarea", dir: "ltr" },
              { name: "scopeNoteAr", label: c("scopeNoteAr"), type: "textarea", dir: "rtl" },
              { name: "isOther", label: c("isOther"), type: "bool" },
              { name: "active", label: t("Common.active"), type: "bool" },
            ]}
            defaults={{ kind: "OTHER", nameEn: "", nameAr: "", wingId: "", parentId: "", fields: [], descEn: "", descAr: "", scopeNoteEn: "", scopeNoteAr: "", verification: selected.verification, isOther: false, active: true, sortOrder: 999 }}
            rows={selected.areas.map((a) => ({
              id: a.id, inactive: !a.active || !!a.archivedAt,
              values: { kind: a.kind, nameEn: a.nameEn, nameAr: a.nameAr, wingId: a.wingId ?? "", parentId: a.parentId ?? "", fields: a.fields, descEn: a.descEn, descAr: a.descAr, scopeNoteEn: a.scopeNoteEn, scopeNoteAr: a.scopeNoteAr, verification: a.verification, isOther: a.isOther, active: a.active, sortOrder: a.sortOrder },
              cells: [
                <span key="k" className="inline-flex items-center gap-2"><AreaIcon kind={a.kind} className="size-4 text-deep" />{kindLabel(a.kind)}</span>,
                <span key="e">{a.nameEn}{archivedTag(a.archivedAt)}</span>, a.nameAr,
                <span key="w" className="text-xs">{a.wing ? pickName(a.wing, locale) : selected.wingLinks.length ? c("sharedAllWings") : "—"}</span>,
                <span key="f" className="text-xs text-fmuted">{a.fields.map((x) => t(`Fields.${x}` as "Fields.room")).join(", ") || "—"}</span>,
                ver(a.verification),
                act(a.active),
              ],
              extra: <ArchiveButton entity="area" id={a.id} archived={!!a.archivedAt} />,
            }))}
          />

          <ConfigTable
            key={`locs-${selected.id}`}
            entity="location"
            title={`${c("specificLocations")} · ${selected.code}`}
            help={c("specificHelp")}
            addLabel={c("addLocation")}
            canMove
            fixed={{ floorId: selected.id }}
            columns={[c("locationKind"), c("locCode"), t("Common.nameEn"), t("Common.nameAr"), t("Wizard.area"), c("wingOfArea"), c("verification"), ""]}
            fields={[
              { name: "kind", label: c("locationKind"), type: "select", options: LOCATION_KINDS.map((k) => ({ value: k, label: t(`LocationKind.${k}`) })) },
              { name: "code", label: c("locCode"), type: "text", dir: "ltr" },
              ...names,
              { name: "areaId", label: t("Wizard.area"), type: "select", nullable: true, options: selected.areas.map((a) => ({ value: a.id, label: pickName(a, locale) })) },
              { name: "wingId", label: c("wingOfArea"), type: "select", nullable: true, options: selected.wingLinks.map((l) => ({ value: l.wingId, label: pickName(l.wing, locale) })) },
              verificationField,
              { name: "active", label: t("Common.active"), type: "bool" },
            ]}
            defaults={{ kind: "ROOM", code: "", nameEn: "", nameAr: "", areaId: "", wingId: "", verification: "CONFIRMED", active: true, sortOrder: 999 }}
            rows={selected.locations.map((l) => {
              const Icon = LOCATION_ICONS[l.kind];
              return {
                id: l.id, inactive: !l.active || !!l.archivedAt,
                values: { kind: l.kind, code: l.code, nameEn: l.nameEn, nameAr: l.nameAr, areaId: l.areaId ?? "", wingId: l.wingId ?? "", verification: l.verification, active: l.active, sortOrder: l.sortOrder },
                cells: [
                  <span key="k" className="inline-flex items-center gap-2">{Icon && <Icon className="size-4 text-deep" />}{t(`LocationKind.${l.kind}` as "LocationKind.ROOM")}</span>,
                  <span key="c" className="font-mono" dir="ltr">{l.code || "—"}{archivedTag(l.archivedAt)}</span>,
                  l.nameEn || "—", l.nameAr || "—",
                  l.area ? pickName(l.area, locale) : <span key="a" className="text-xs text-fmuted">{c("floors")}</span>,
                  l.wing ? pickName(l.wing, locale) : "—",
                  ver(l.verification),
                  act(l.active),
                ],
                extra: <ArchiveButton entity="location" id={l.id} archived={!!l.archivedAt} />,
              };
            })}
          />
        </section>
      )}

      <ConfigTable
        entity="areaCategory"
        title={c("areaLibrary")}
        help={c("areaLibraryHelp")}
        addLabel={c("addAreaCategory")}
        canMove
        columns={[c("code"), t("Common.nameEn"), t("Common.nameAr"), c("defaultFields"), c("areas"), ""]}
        fields={[
          { name: "key", label: c("code"), type: "text", dir: "ltr", help: "A–Z, 0–9, _" },
          ...names,
          { name: "defaultFields", label: c("defaultFields"), type: "multi", wide: true, options: fieldOptions },
          { name: "active", label: t("Common.active"), type: "bool" },
        ]}
        defaults={{ key: "", nameEn: "", nameAr: "", icon: "map-pin", defaultFields: ["landmark"], active: true, sortOrder: 999 }}
        rows={categories.map((x) => ({
          id: x.id, inactive: !x.active || !!x.archivedAt,
          values: { key: x.key, nameEn: x.nameEn, nameAr: x.nameAr, icon: x.icon, defaultFields: x.defaultFields, active: x.active, sortOrder: x.sortOrder },
          cells: [
            <span key="k" className="inline-flex items-center gap-2 font-mono text-xs"><AreaIcon kind={x.key} className="size-4 text-deep" />{x.key}{archivedTag(x.archivedAt)}</span>,
            x.nameEn, x.nameAr,
            <span key="f" className="text-xs text-fmuted">{x.defaultFields.map((f) => t(`Fields.${f}` as "Fields.room")).join(", ") || "—"}</span>,
            x._count.areas,
            act(x.active),
          ],
          extra: <ArchiveButton entity="areaCategory" id={x.id} archived={!!x.archivedAt} />,
        }))}
      />
    </div>
  );
}
