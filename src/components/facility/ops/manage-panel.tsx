"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Camera, Loader2, Lock, MessageSquare, UserCheck } from "lucide-react";
import type { FacPriority, FacStatus } from "@prisma/client";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { opsAssignAction, opsCompletionPhotoAction, opsEscalateAction, opsNoteAction, opsPriorityAction, opsStatusAction } from "@/features/facility/actions/ops";
import { fhBtn, fhInput } from "../ui";

type Props = {
  id: string;
  status: FacStatus;
  priority: FacPriority;
  teamId: string | null;
  targets: FacStatus[];
  teams: { id: string; label: string; disabled: boolean; note?: string }[];
  suggested: string | null;
  can: { assign: boolean; manage: boolean };
};

/** Operator panel: status, assignment, priority, escalation, notes and completion photos. Server re-checks everything. */
export function ManagePanel(p: Props) {
  const t = useTranslations("Fac");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [to, setTo] = useState<FacStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [infoRequired, setInfoRequired] = useState(false);
  const [team, setTeam] = useState(p.teamId ?? "");
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState(true);
  const [reason, setReason] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        after?.();
        setMsg({ ok: true, text: t("Common.saved") });
        router.refresh();
      } else setMsg({ ok: false, text: r.error === "invalid" ? t("Common.invalid") : r.error === "forbidden" ? t("Common.forbidden") : r.error === "uploadBadType" ? t("Common.uploadBadType") : t("Common.error") });
    });

  const box = "rounded-[22px] border border-fline bg-white p-5";
  return (
    <div className="space-y-4">
      {/* status */}
      <section className={box}>
        <h2 className="font-extrabold text-fink">{t("Ops.detail.changeStatus")}</h2>
        {p.targets.length === 0 ? (
          <p className="mt-2 text-sm text-fmuted">{t("Ops.detail.noTransitions")}</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={t("Ops.detail.status")}>
              {p.targets.map((s) => (
                <button key={s} role="radio" aria-checked={to === s} onClick={() => setTo(s)} className={cn("rounded-full border-2 px-3 py-1.5 text-xs font-bold transition", to === s ? "border-deep bg-deep text-white" : "border-fline hover:border-lav-200")}>
                  {t(`Status.${s}`)}
                </button>
              ))}
            </div>
            {to && (
              <>
                <textarea rows={2} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder={t("Ops.detail.statusComment")} aria-label={t("Ops.detail.statusComment")} className={cn(fhInput, "mt-3 text-sm")} maxLength={2000} />
                {to === "ON_HOLD" && (
                  <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={infoRequired} onChange={(e) => setInfoRequired(e.target.checked)} className="size-4 accent-[#2D13EA]" /> {t("Ops.detail.infoRequired")}</label>
                )}
                <button
                  disabled={pending || (to === "RESOLVED" && statusNote.trim().length < 3)}
                  onClick={() => run(() => opsStatusAction(p.id, to, statusNote, { infoRequired: to === "ON_HOLD" && infoRequired }), () => { setTo(""); setStatusNote(""); })}
                  className={cn(fhBtn.primary, "mt-3 w-full")}
                >
                  {pending && <Loader2 className="size-4 animate-spin" />} {t("Ops.detail.changeStatus")}: {t(`Status.${to}`)}
                </button>
              </>
            )}
          </>
        )}
      </section>

      {/* assignment */}
      {p.can.assign && (
        <section className={box}>
          <h2 className="flex items-center gap-2 font-extrabold text-fink"><UserCheck className="size-4 text-deep" /> {t("Ops.detail.assign")}</h2>
          {p.suggested && <p className="mt-1 text-xs text-fmuted">{t("Ops.detail.suggested", { team: p.suggested })}</p>}
          <select value={team} onChange={(e) => setTeam(e.target.value)} className={cn(fhInput, "mt-3 text-sm")} aria-label={t("Ops.detail.team")}>
            <option value="">{t("Ops.detail.team")}</option>
            {p.teams.map((x) => <option key={x.id} value={x.id} disabled={x.disabled}>{x.label}{x.note ? ` (${x.note})` : ""}</option>)}
          </select>
          <button disabled={pending || !team || team === p.teamId} onClick={() => run(() => opsAssignAction(p.id, team))} className={cn(fhBtn.secondary, "mt-3 w-full")}>{t("Ops.detail.assign")}</button>
        </section>
      )}

      {/* priority + escalation */}
      {p.can.manage && (
        <section className={box}>
          <h2 className="font-extrabold text-fink">{t("Ops.detail.priority")}</h2>
          <div className="mt-3 grid grid-cols-4 gap-1 rounded-full bg-lav-50 p-1">
            {(["LOW", "MEDIUM", "HIGH", "EMERGENCY"] as const).map((x) => (
              <button key={x} disabled={pending} onClick={() => x !== p.priority && run(() => opsPriorityAction(p.id, x))} aria-pressed={x === p.priority}
                className={cn("rounded-full px-1 py-1.5 text-xs font-bold transition", x === p.priority ? (x === "EMERGENCY" ? "bg-red-600 text-white" : "bg-deep text-white") : "text-fmuted hover:text-deep")}>
                {t(`Priority.${x}`)}
              </button>
            ))}
          </div>
          <h2 className="mt-6 flex items-center gap-2 font-extrabold text-fink"><ArrowUpRight className="size-4 text-gold" /> {t("Ops.detail.escalate")}</h2>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("Ops.detail.escalateReason")} aria-label={t("Ops.detail.escalateReason")} className={cn(fhInput, "mt-3 text-sm")} maxLength={500} />
          <button disabled={pending || reason.trim().length < 3} onClick={() => run(() => opsEscalateAction(p.id, reason), () => setReason(""))} className={cn(fhBtn.secondary, "mt-3 w-full")}>{t("Ops.detail.escalate")}</button>
        </section>
      )}

      {/* notes */}
      <section className={box}>
        <h2 className="flex items-center gap-2 font-extrabold text-fink"><MessageSquare className="size-4 text-deep" /> {t("Ops.detail.note")}</h2>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} aria-label={t("Ops.detail.note")} className={cn(fhInput, "mt-3 text-sm")} maxLength={2000} />
        <div className="mt-2 flex rounded-full bg-lav-50 p-1 text-xs font-bold">
          <button onClick={() => setInternal(true)} aria-pressed={internal} className={cn("flex flex-1 items-center justify-center gap-1 rounded-full py-1.5", internal ? "bg-white text-[#7A5A00] shadow" : "text-fmuted")}><Lock className="size-3" /> {t("Ops.detail.internal").split(" (")[0]}</button>
          <button onClick={() => setInternal(false)} aria-pressed={!internal} className={cn("flex-1 rounded-full py-1.5", !internal ? "bg-white text-deep shadow" : "text-fmuted")}>{t("Ops.detail.public")}</button>
        </div>
        <p className="mt-1 text-xs text-fmuted">{internal ? t("Ops.detail.internal") : t("Ops.detail.public")}</p>
        <button disabled={pending || note.trim().length < 2} onClick={() => run(() => opsNoteAction(p.id, note, internal), () => setNote(""))} className={cn(fhBtn.secondary, "mt-3 w-full")}>{t("Detail.send")}</button>
      </section>

      {/* completion photos */}
      <section className={box}>
        <label className={cn(fhBtn.ghost, "w-full cursor-pointer")}>
          <Camera className="size-4" /> {t("Ops.detail.completionPhoto")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => {
              const fd = new FormData();
              Array.from(e.target.files ?? []).forEach((f) => fd.append("photos", f));
              e.target.value = "";
              run(() => opsCompletionPhotoAction(p.id, fd));
            }}
          />
        </label>
      </section>

      {msg && <p role="status" className={cn("rounded-2xl px-4 py-3 text-sm font-medium", msg.ok ? "bg-[#E8F9EF] text-[#1B6B3E]" : "bg-red-50 text-red-700")}>{msg.text}</p>}
    </div>
  );
}
