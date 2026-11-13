import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireFacPage } from "@/features/facility/server/guard";
import { pickName } from "@/features/facility/format";
import { MapEditor } from "@/components/facility/map/map-editor";

export default async function MapEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireFacPage("config.manage");
  const { id } = await params;
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const map = await db.facFloorMap.findUnique({ where: { id }, include: { wing: true, floor: { include: { areas: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }, locations: { where: { archivedAt: null }, orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] } } }, markers: true } });
  if (!map) notFound();
  const Back = locale === "ar" ? ArrowRight : ArrowLeft;
  return (
    <div className="mx-auto max-w-[1400px]">
      <Link href="/facility/ops/maps" className="inline-flex items-center gap-2 text-sm font-semibold text-deep hover:underline"><Back className="size-4" /> {t("Ops.nav.maps")}</Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-fink">
        <span className="font-mono" dir="ltr">{map.floor.code}</span>{map.wing && ` · ${pickName(map.wing, locale)}`} · {map.title || pickName(map.floor, locale)}
      </h1>
      <p className="mb-5 text-sm text-fmuted">{map.status === "PUBLISHED" ? t("Ops.config.published") : t("Ops.config.draft")} · {t("Ops.config.dimensions", { w: map.width, h: map.height })}</p>
      <MapEditor
        map={{ id: map.id, width: map.width, height: map.height, status: map.status }}
        areas={map.floor.areas.map((a) => ({ id: a.id, label: pickName(a, locale), en: a.nameEn, ar: a.nameAr }))}
        locations={map.floor.locations.map((l) => {
          const name = [pickName(l, locale) || t(`LocationKind.${l.kind}` as "LocationKind.ROOM"), l.code].filter(Boolean).join(" ");
          return { id: l.id, areaId: l.areaId, label: `${t(`LocationKind.${l.kind}` as "LocationKind.ROOM")} · ${name}`, en: [l.nameEn, l.code].filter(Boolean).join(" "), ar: [l.nameAr, l.code].filter(Boolean).join(" ") };
        })}
        initial={map.markers.map((m) => ({
          id: m.id, kind: m.kind === "ZONE" ? "ZONE" : "POINT", areaId: m.areaId, locationId: m.locationId, labelEn: m.labelEn, labelAr: m.labelAr, x: m.x, y: m.y,
          points: (m.points as [number, number][] | null) ?? null, color: m.color,
        }))}
      />
    </div>
  );
}
