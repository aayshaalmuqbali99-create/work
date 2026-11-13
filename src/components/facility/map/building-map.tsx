"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { FloorMapViewer, type MapMarker } from "./floor-map-viewer";
import { fhBtn } from "../ui";

export type PublishedMap = { id: string; floorCode: string; floorName: string; width: number; height: number; markers: MapMarker[] };

export function BuildingMap({ maps }: { maps: PublishedMap[] }) {
  const t = useTranslations("Fac.Map");
  const [mapId, setMapId] = useState(maps[0].id);
  const [sel, setSel] = useState<MapMarker | null>(null);
  const map = maps.find((m) => m.id === mapId)!;
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("floor")}>
        {maps.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={m.id === mapId}
            onClick={() => { setMapId(m.id); setSel(null); }}
            className={cn("rounded-2xl border-2 px-4 py-2 text-start transition", m.id === mapId ? "border-deep bg-lav-50" : "border-fline bg-white hover:border-lav-200")}
          >
            <span className="block font-mono text-lg font-extrabold text-deep" dir="ltr">{m.floorCode}</span>
            <span className="block text-xs text-fmuted">{m.floorName}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-fmuted">{t("tapHint")}</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_320px]">
        <FloorMapViewer key={map.id} src={`/api/facility/maps/${map.id}/image`} width={map.width} height={map.height} markers={map.markers} selectedId={sel?.id} onSelect={setSel} className="h-[62vh] min-h-[380px]" />
        <div>
          <AnimatePresence mode="wait">
            {sel ? (
              <motion.div key={sel.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-[24px] border border-fline bg-white p-5 shadow-soft">
                <p className="text-xs font-bold uppercase tracking-wider text-fmuted">{t("selected")}</p>
                <p className="mt-1 flex items-center gap-2 text-xl font-extrabold text-fink"><MapPin className="size-5 text-deep" aria-hidden="true" /> {sel.label}</p>
                {(sel.areaId || sel.locationId) && (
                  <Link href={{ pathname: "/facility/request", query: sel.locationId ? { location: sel.locationId, from: "map" } : { area: sel.areaId!, from: "map" } }} className={cn(fhBtn.accent, "mt-5 w-full")}>
                    {t("reportHere")}
                  </Link>
                )}
              </motion.div>
            ) : (
              <ul className="space-y-2" aria-label={map.floorName}>
                {map.markers.map((m) => (
                  <li key={m.id}>
                    <button onClick={() => setSel(m)} className="flex w-full items-center gap-3 rounded-2xl border border-fline bg-white px-4 py-3 text-start text-sm font-semibold hover:border-lav-200">
                      <span className="size-3 rounded-full" style={{ background: m.color }} /> {m.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
