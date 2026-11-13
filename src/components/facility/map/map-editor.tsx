"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Eye, Loader2, MapPin, MousePointer2, Pentagon, Save, Trash2, Check, Globe, EyeOff } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { deleteMapAction, saveMarkersAction, setMapStatusAction } from "@/features/facility/actions/maps";
import { FloorMapViewer, type MapMarker } from "./floor-map-viewer";
import { fhBtn, fhInput } from "../ui";

type EditMarker = { id: string; kind: "POINT" | "ZONE"; areaId: string | null; locationId: string | null; labelEn: string; labelAr: string; x: number; y: number; points: [number, number][] | null; color: string };
const COLORS = ["#2D13EA", "#FF7800", "#17A598", "#9C94FF", "#1D8FC4", "#E04F2E"];

/** Floor-plan editor: place markers, draw zones, link them to configured areas, preview, publish. */
export function MapEditor({
  map,
  areas,
  locations,
  initial,
}: {
  map: { id: string; width: number; height: number; status: "DRAFT" | "PUBLISHED" };
  areas: { id: string; label: string; en: string; ar: string }[];
  locations: { id: string; areaId: string | null; label: string; en: string; ar: string }[];
  initial: EditMarker[];
}) {
  const t = useTranslations("Fac");
  const locale = useLocale();
  const router = useRouter();
  const [markers, setMarkers] = useState<EditMarker[]>(initial);
  const [mode, setMode] = useState<"select" | "point" | "zone" | "preview">("select");
  const [draft, setDraft] = useState<[number, number][]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const c = (k: string) => t(`Ops.config.${k}` as "Ops.config.code");
  const selected = markers.find((m) => m.id === sel) ?? null;

  const update = (id: string, patch: Partial<EditMarker>) => {
    setMarkers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setDirty(true);
  };
  const add = (m: Omit<EditMarker, "id" | "labelEn" | "labelAr" | "areaId" | "locationId" | "color">) => {
    const id = `new-${Math.random().toString(36).slice(2, 10)}`;
    setMarkers((ms) => [...ms, { ...m, id, labelEn: "", labelAr: "", areaId: null, locationId: null, color: COLORS[ms.length % COLORS.length] }]);
    setSel(id);
    setDirty(true);
  };

  const onPlanClick = (x: number, y: number) => {
    if (mode === "point") {
      add({ kind: "POINT", x, y, points: null });
      setMode("select");
    } else if (mode === "zone") setDraft((d) => [...d, [x, y]]);
  };
  const finishZone = () => {
    if (draft.length >= 3) {
      const cx = draft.reduce((a, p) => a + p[0], 0) / draft.length;
      const cy = draft.reduce((a, p) => a + p[1], 0) / draft.length;
      add({ kind: "ZONE", x: cx, y: cy, points: draft });
    }
    setDraft([]);
    setMode("select");
  };

  const save = () =>
    start(async () => {
      const r = await saveMarkersAction(map.id, markers.map(({ id, ...m }) => ({ ...m, id: id.startsWith("new-") ? undefined : id })));
      setMsg(r.ok ? t("Common.saved") : t("Common.invalid"));
      if (r.ok) {
        setDirty(false);
        router.refresh();
      }
    });

  const viewMarkers: MapMarker[] = markers.map((m) => ({
    id: m.id, kind: m.kind, x: m.x, y: m.y, points: m.points, color: m.color, areaId: m.areaId, locationId: m.locationId,
    label: (locale === "ar" ? m.labelAr || m.labelEn : m.labelEn || m.labelAr) || areas.find((a) => a.id === m.areaId)?.label || "•",
  }));

  const tool = (k: typeof mode, icon: React.ReactNode, label: string) => (
    <button type="button" onClick={() => { setMode(k); setDraft([]); }} aria-pressed={mode === k} className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition", mode === k ? "bg-deep text-white" : "text-fmuted hover:bg-lav-50 hover:text-deep")}>
      {icon} {label}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-fline bg-white p-2">
        {tool("select", <MousePointer2 className="size-4" />, c("select"))}
        {tool("point", <MapPin className="size-4" />, c("addPoint"))}
        {tool("zone", <Pentagon className="size-4" />, c("addZone"))}
        {tool("preview", <Eye className="size-4" />, c("preview"))}
        {mode === "zone" && <button onClick={finishZone} disabled={draft.length < 3} className={cn(fhBtn.accent, "min-h-9 py-1.5")}><Check className="size-4" /> {c("finishZone")}</button>}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {msg && <span role="status" className="text-sm font-semibold text-fmuted">{msg}</span>}
          <button onClick={save} disabled={pending || !dirty} className={cn(fhBtn.primary, "min-h-10 py-2")}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {c("saveMarkers")}</button>
          <button
            disabled={pending || dirty}
            onClick={() => start(async () => { await setMapStatusAction(map.id, map.status !== "PUBLISHED"); router.refresh(); })}
            className={cn(map.status === "PUBLISHED" ? fhBtn.secondary : fhBtn.accent, "min-h-10 py-2")}
          >
            {map.status === "PUBLISHED" ? <EyeOff className="size-4" /> : <Globe className="size-4" />} {map.status === "PUBLISHED" ? c("unpublish") : c("publish")}
          </button>
          <button
            disabled={pending}
            onClick={() => confirm(`${t("Common.delete")}?`) && start(async () => { await deleteMapAction(map.id); router.push("/facility/ops/maps"); })}
            className="grid size-10 place-items-center rounded-full text-red-600 hover:bg-red-50"
            aria-label={t("Common.delete")}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm text-fmuted">{mode === "point" ? c("pointHint") : mode === "zone" ? c("zoneHint") : mode === "preview" ? t("Map.tapHint") : ""}</p>

      <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_340px]">
        <FloorMapViewer
          src={`/api/facility/maps/${map.id}/image`}
          width={map.width}
          height={map.height}
          markers={viewMarkers}
          selectedId={sel}
          onSelect={(m) => mode !== "point" && mode !== "zone" && setSel(m.id)}
          onPlanClick={mode === "point" || mode === "zone" ? onPlanClick : undefined}
          draftPoints={draft}
          className="h-[68vh] min-h-[420px]"
        />
        <aside className="space-y-3">
          {mode === "preview" ? (
            <p className="rounded-[22px] border border-fline bg-white p-4 text-sm text-fmuted">{selected ? viewMarkers.find((m) => m.id === selected.id)?.label : t("Map.tapHint")}</p>
          ) : selected ? (
            <div className="space-y-3 rounded-[22px] border border-fline bg-white p-4">
              <div>
                <label htmlFor="mk-area" className="mb-1 block text-sm font-semibold">{c("linkedArea")}</label>
                <select
                  id="mk-area"
                  value={selected.areaId ?? ""}
                  onChange={(e) => {
                    const a = areas.find((x) => x.id === e.target.value);
                    update(selected.id, { areaId: a?.id ?? null, labelEn: selected.labelEn || a?.en || "", labelAr: selected.labelAr || a?.ar || "" });
                  }}
                  className={`${fhInput} text-sm`}
                >
                  <option value="">—</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="mk-loc" className="mb-1 block text-sm font-semibold">{c("linkedLocation")}</label>
                <select
                  id="mk-loc"
                  value={selected.locationId ?? ""}
                  onChange={(e) => {
                    const l = locations.find((x) => x.id === e.target.value);
                    update(selected.id, { locationId: l?.id ?? null, areaId: l?.areaId ?? selected.areaId, labelEn: selected.labelEn || l?.en || "", labelAr: selected.labelAr || l?.ar || "" });
                  }}
                  className={`${fhInput} text-sm`}
                >
                  <option value="">—</option>
                  {locations.filter((l) => !selected.areaId || !l.areaId || l.areaId === selected.areaId).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="mk-en" className="mb-1 block text-sm font-semibold">{c("labelEn")}</label>
                <input id="mk-en" dir="ltr" value={selected.labelEn} onChange={(e) => update(selected.id, { labelEn: e.target.value })} className={`${fhInput} text-sm`} maxLength={80} />
              </div>
              <div>
                <label htmlFor="mk-ar" className="mb-1 block text-sm font-semibold">{c("labelAr")}</label>
                <input id="mk-ar" dir="rtl" value={selected.labelAr} onChange={(e) => update(selected.id, { labelAr: e.target.value })} className={`${fhInput} text-sm`} maxLength={80} />
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold">{c("color")}</p>
                <div className="flex gap-2">
                  {COLORS.map((col) => <button key={col} type="button" onClick={() => update(selected.id, { color: col })} aria-label={col} aria-pressed={selected.color === col} className={cn("size-8 rounded-full ring-offset-2 transition", selected.color === col && "ring-2 ring-fink")} style={{ background: col }} />)}
                </div>
              </div>
              <button onClick={() => { setMarkers((ms) => ms.filter((m) => m.id !== selected.id)); setSel(null); setDirty(true); }} className={`${fhBtn.danger} w-full`}>
                <Trash2 className="size-4" /> {c("removeMarker")}
              </button>
            </div>
          ) : null}
          <ul className="max-h-[40vh] space-y-1.5 overflow-y-auto">
            {viewMarkers.map((m) => (
              <li key={m.id}>
                <button onClick={() => setSel(m.id)} className={cn("flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-start text-sm font-semibold", sel === m.id ? "border-deep bg-lav-50" : "border-fline bg-white hover:border-lav-200")}>
                  <span className="size-3 rounded-full" style={{ background: m.color }} />
                  {m.kind === "ZONE" ? <Pentagon className="size-3.5 text-fmuted" /> : <MapPin className="size-3.5 text-fmuted" />} {m.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
