"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { RequestStatus } from "@prisma/client";
import { updateRequestAction } from "@/features/requests/actions";
import { btnPrimary, inputCls } from "./ui";

const STATUSES: RequestStatus[] = ["NEW", "IN_REVIEW", "APPROVED", "REJECTED", "COMPLETED"];

export function RequestControls({ id, status, note }: { id: string; status: RequestStatus; note: string }) {
  const t = useTranslations("Admin");
  const [s, setS] = useState(status);
  const [n, setN] = useState(note);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-muted">
        {t("colStatus")}
        <select value={s} onChange={(e) => { setS(e.target.value as RequestStatus); setSaved(false); }} className={`${inputCls} mt-1 w-40`}>
          {STATUSES.map((x) => <option key={x} value={x}>{t(`rstatus_${x}`)}</option>)}
        </select>
      </label>
      <label className="min-w-48 flex-1 text-xs text-muted">
        {t("adminNote")}
        <input value={n} onChange={(e) => { setN(e.target.value); setSaved(false); }} className={`${inputCls} mt-1`} />
      </label>
      <button type="button" disabled={pending} className={btnPrimary} onClick={() => start(async () => { const r = await updateRequestAction(id, s, n); setSaved(r.ok); })}>
        {saved ? t("saved") : t("save")}
      </button>
    </div>
  );
}
