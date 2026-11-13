"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, RotateCcw } from "lucide-react";
import type { WizardConfig } from "@/features/facility/server/queries";
import { LocationFields, validateLocation, type LocationValue } from "../wizard/simple-request-form";
import { fhBtn } from "../ui";

/** The employee "Where is it?" section, rendered for administrators. Nothing is submitted. */
export function LocationPreview({ config }: { config: WizardConfig }) {
  const t = useTranslations("Fac");
  const empty: LocationValue = { buildingId: config.buildings[0]?.id ?? null, floorId: "", wingId: "", areaId: "", locationId: "", exact: "" };
  const [v, setV] = useState<LocationValue>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <div className="rounded-[28px] border border-fline bg-white p-5 sm:p-8">
      <p className="mb-6 flex items-center gap-2 rounded-2xl bg-lav-50 px-4 py-3 text-sm text-deep"><Eye className="size-4" aria-hidden="true" /> {t("Ops.config.previewNote")}</p>
      <h2 className="mb-4 text-lg font-extrabold">{t("Simple.whereTitle")}</h2>
      <LocationFields config={config} value={v} onChange={(p) => { setV((x) => ({ ...x, ...p })); setErrors({}); }} errors={errors} />
      <div className="mt-8 flex flex-wrap gap-3 border-t border-fline pt-6">
        <button type="button" className={fhBtn.primary} onClick={() => setErrors(validateLocation(config, v, (k) => t(k as "Wizard.chooseFloor")))}>{t("Wizard.next")}</button>
        <button type="button" className={fhBtn.ghost} onClick={() => { setV(empty); setErrors({}); }}><RotateCcw className="size-4" aria-hidden="true" /> {t("Wizard.startOver")}</button>
      </div>
    </div>
  );
}
