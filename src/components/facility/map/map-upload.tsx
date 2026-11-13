"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { uploadMapAction } from "@/features/facility/actions/maps";
import { fhBtn, fhInput } from "../ui";

export function MapUpload({ floors }: { floors: { id: string; label: string }[] }) {
  const t = useTranslations("Fac");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3 rounded-[22px] border border-dashed border-lav-200 bg-lav-50/50 p-5 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end"
      action={(fd) =>
        start(async () => {
          setErr(null);
          const r = await uploadMapAction(fd);
          if (r.ok && r.data) router.push(`/facility/ops/maps/${r.data.id}`);
          else if (!r.ok) setErr(r.error === "uploadBadType" ? t("Common.uploadBadType") : r.error === "uploadTooLarge" ? t("Common.uploadTooLarge", { size: 15 }) : t("Common.error"));
        })
      }
    >
      <div>
        <label htmlFor="map-floor" className="mb-1.5 block text-sm font-semibold">{t("Wizard.floor")}</label>
        <select id="map-floor" name="floorId" required className={fhInput}>
          {floors.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="map-title" className="mb-1.5 block text-sm font-semibold">{t("Ops.config.mapTitle")}</label>
        <input id="map-title" name="title" maxLength={120} className={fhInput} />
      </div>
      <div>
        <label htmlFor="map-file" className="mb-1.5 block text-sm font-semibold">{t("Ops.config.uploadMap")}</label>
        <input id="map-file" name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" className={`${fhInput} py-2 file:me-3 file:rounded-full file:border-0 file:bg-deep file:px-3 file:py-1.5 file:text-white`} />
      </div>
      <button className={fhBtn.primary} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {t("Ops.config.uploadMap")}</button>
      {err && <p role="alert" className="text-sm font-semibold text-red-600 sm:col-span-4">{err}</p>}
    </form>
  );
}
