import { getTranslations, setRequestLocale } from "next-intl/server";
import { Map as MapIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireFacPage } from "@/features/facility/server/guard";
import { pickName } from "@/features/facility/format";
import { BuildingMap } from "@/components/facility/map/building-map";
import { EmptyState, fhBtn } from "@/components/facility/ui";
import type { MapMarker } from "@/components/facility/map/floor-map-viewer";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "Fac.Map" });
  return { title: t("title") };
}

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireFacPage(undefined, "/facility/map");
  const t = await getTranslations("Fac");
  const maps = await db.facFloorMap.findMany({
    where: { status: "PUBLISHED", floor: { active: true } },
    include: { floor: true, markers: { include: { area: { select: { active: true } } } } },
    orderBy: [{ floor: { sortOrder: "asc" } }, { publishedAt: "desc" }],
  });
  // one published map per floor (most recent)
  const perFloor = maps.filter((m, i) => maps.findIndex((x) => x.floorId === m.floorId) === i);
  return (
    <div className="bg-[linear-gradient(180deg,#F6F5FF_0,#ffffff_420px)] px-5 pb-10 pt-32 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-fink sm:text-5xl">{t("Map.title")}</h1>
        <p className="mt-3 text-lg text-fmuted">{t("Map.subtitle")}</p>
        <div className="mt-10">
          {perFloor.length === 0 ? (
            <EmptyState
              icon={<MapIcon className="size-7" />}
              title={t("Map.comingTitle")}
              text={`${t("Map.comingText")} ${t("Map.comingHint")}`}
              action={<Link href="/facility/request" className={fhBtn.primary}>{t("Home.report")}</Link>}
            />
          ) : (
            <BuildingMap
              maps={perFloor.map((m) => ({
                id: m.id,
                floorCode: m.floor.code,
                floorName: pickName(m.floor, locale),
                width: m.width,
                height: m.height,
                markers: m.markers.map(
                  (k): MapMarker => ({
                    id: k.id,
                    kind: k.kind === "ZONE" ? "ZONE" : "POINT",
                    x: k.x,
                    y: k.y,
                    points: (k.points as [number, number][] | null) ?? null,
                    label: (locale === "ar" ? k.labelAr || k.labelEn : k.labelEn || k.labelAr) || "•",
                    color: k.color,
                    areaId: k.area?.active ? k.areaId : null,
                  }),
                ),
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
