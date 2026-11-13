"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { redeemActionTokenAction } from "@/features/facility/actions/requests";
import { fhBtn, fhInput } from "./ui";

export function TokenAction({ token, purpose }: { token: string; purpose: "CONFIRM" | "REOPEN" }) {
  const t = useTranslations("Fac.Action");
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState(false);
  if (done)
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-[#1B6B3E]" aria-hidden="true" />
        <p className="mt-4 text-lg font-bold" role="status">{purpose === "CONFIRM" ? t("doneConfirm") : t("doneReopen")}</p>
        <Link href={`/facility/requests/${done}`} className={`${fhBtn.secondary} mt-6`}>{t("view")}</Link>
      </div>
    );
  return (
    <div>
      <h1 className="text-2xl font-extrabold">{purpose === "CONFIRM" ? t("confirmTitle") : t("reopenTitle")}</h1>
      <p className="mt-2 text-fmuted">{purpose === "CONFIRM" ? t("confirmText") : t("reopenText")}</p>
      {purpose === "REOPEN" && <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={`${fhInput} mt-4`} maxLength={2000} aria-label={t("reopenText")} />}
      {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{t("expired")}</p>}
      <button
        className={`${fhBtn.primary} mt-6`}
        disabled={pending || (purpose === "REOPEN" && reason.trim().length < 3)}
        onClick={() =>
          start(async () => {
            const r = await redeemActionTokenAction(token, reason);
            if (r.ok && r.data) setDone(r.data.reference);
            else setError(true);
          })
        }
      >
        {pending && <Loader2 className="size-4 animate-spin" />} {purpose === "CONFIRM" ? t("confirmBtn") : t("reopenBtn")}
      </button>
    </div>
  );
}
