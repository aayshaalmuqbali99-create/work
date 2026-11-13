import { getLocale, getTranslations } from "next-intl/server";
import { Map as MapIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireFacPage } from "@/features/facility/server/guard";
import { formatDate, pickName } from "@/features/facility/format";
import { MapUpload } from "@/components/facility/map/map-upload";
import { EmptyState } from "@/components/facility/ui";
import { cn } from "@/lib/utils";

export default async function MapsAdminPage() {
  await requireFacPage("config.manage");
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const [floors, maps] = await Promise.all([
    db.facFloor.findMany({ orderBy: { sortOrder: "asc" }, include: { building: true } }),
    db.facFloorMap.findMany({ orderBy: { createdAt: "desc" }, include: { floor: true, _count: { select: { markers: true } } } }),
  ]);
  const c = (k: string) => t(`Ops.config.${k}` as "Ops.config.code");
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-fink">{c("mapsTitle")}</h1>
        <p className="mt-2 max-w-3xl text-fmuted">{c("mapsHelp")}</p>
      </div>
      <MapUpload floors={floors.map((f) => ({ id: f.id, label: `${f.code} · ${pickName(f, locale)}` }))} />
      {maps.length === 0 ? (
        <EmptyState icon={<MapIcon className="size-7" />} title={c("noMaps")} text={`${t("Map.comingTitle")} — ${t("Map.comingText")}`} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((m) => (
            <li key={m.id}>
              <Link href={`/facility/ops/maps/${m.id}`} className="block overflow-hidden rounded-[22px] border border-fline bg-white transition hover:-translate-y-0.5 hover:shadow-lift">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/facility/maps/${m.id}/image`} alt="" className="aspect-[4/3] w-full bg-lav-50 object-contain" />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-lg font-extrabold text-deep" dir="ltr">{m.floor.code}</span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", m.status === "PUBLISHED" ? "bg-[#E8F9EF] text-[#1B6B3E]" : "bg-lav-50 text-deep")}>{m.status === "PUBLISHED" ? c("published") : c("draft")}</span>
                  </div>
                  <p className="mt-1 font-semibold text-fink">{m.title || pickName(m.floor, locale)}</p>
                  <p className="text-xs text-fmuted">{formatDate(m.createdAt, locale)} · {m._count.markers} · {t("Ops.config.dimensions", { w: m.width, h: m.height })}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
