"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Send, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { employeeCommentAction, employeeDecisionAction, feedbackAction } from "@/features/facility/actions/requests";
import { fhBtn, fhInput } from "./ui";

/** Employee actions on their own request. Every action is re-checked on the server. */
export function RequestActions({
  reference,
  canConfirm,
  canReopen,
  canCancel,
  canFeedback,
  reopenDays,
}: {
  reference: string;
  canConfirm: boolean;
  canReopen: boolean;
  canCancel: boolean;
  canFeedback: boolean;
  reopenDays: number;
}) {
  const t = useTranslations("Fac");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [showReopen, setShowReopen] = useState(false);
  const [rating, setRating] = useState(0);
  const [fb, setFb] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText?: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (okText ? { ok: true, text: okText } : null) : { ok: false, text: r.error === "invalid" ? t("Common.invalid") : r.error === "tooMany" ? t("Common.tooMany") : t("Common.error") });
      if (r.ok) router.refresh();
    });

  return (
    <div className="space-y-5">
      {canConfirm && (
        <section className="rounded-[24px] border-2 border-fgreen/60 bg-[#F1FBF5] p-5">
          <h2 className="text-lg font-extrabold text-fink">{t("Detail.confirmTitle")}</h2>
          <p className="mt-1 text-sm text-fmuted">{t("Detail.confirmText")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button disabled={pending} onClick={() => run(() => employeeDecisionAction(reference, "confirm"))} className={fhBtn.primary}>
              <ThumbsUp className="size-4" aria-hidden="true" /> {t("Detail.confirmYes")}
            </button>
            <button disabled={pending} onClick={() => setShowReopen(true)} className={fhBtn.secondary}>
              <ThumbsDown className="size-4" aria-hidden="true" /> {t("Detail.confirmNo")}
            </button>
          </div>
        </section>
      )}

      {canReopen && !canConfirm && !showReopen && (
        <section className="rounded-[24px] border border-fline bg-white p-5">
          <h2 className="font-bold text-fink">{t("Detail.reopenTitle")}</h2>
          <p className="mt-1 text-sm text-fmuted">{t("Detail.reopenText", { days: reopenDays })}</p>
          <button onClick={() => setShowReopen(true)} className={cn(fhBtn.secondary, "mt-4")}>{t("Detail.reopen")}</button>
        </section>
      )}

      {canReopen && showReopen && (
        <section className="rounded-[24px] border border-coral/60 bg-[#FFF5F1] p-5">
          <label htmlFor="fh-reopen" className="font-bold text-fink">{t("Detail.reopenReason")}</label>
          <textarea id="fh-reopen" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={cn(fhInput, "mt-3")} maxLength={2000} />
          <div className="mt-3 flex gap-3">
            <button disabled={pending || reason.trim().length < 3} onClick={() => run(() => employeeDecisionAction(reference, "reopen", reason))} className={fhBtn.primary}>
              {pending && <Loader2 className="size-4 animate-spin" />} {t("Detail.reopen")}
            </button>
            <button onClick={() => setShowReopen(false)} className={fhBtn.ghost}>{t("Common.cancel")}</button>
          </div>
        </section>
      )}

      {canFeedback && (
        <section className="rounded-[24px] border border-fline bg-white p-5">
          <h2 className="font-bold text-fink">{t("Detail.feedbackTitle")}</h2>
          <div className="mt-3 flex gap-1" role="radiogroup" aria-label={t("Detail.feedbackTitle")}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} role="radio" aria-checked={rating === n} aria-label={t("Detail.rating", { n })} onClick={() => setRating(n)} className="rounded-full p-1.5 transition hover:scale-110">
                <Star className={cn("size-7", n <= rating ? "fill-gold text-gold" : "text-lav-200")} />
              </button>
            ))}
          </div>
          <input value={fb} onChange={(e) => setFb(e.target.value)} placeholder={t("Detail.feedbackPh")} className={cn(fhInput, "mt-3")} maxLength={1000} aria-label={t("Detail.feedbackPh")} />
          <button disabled={pending || rating === 0} onClick={() => run(() => feedbackAction(reference, rating, fb), t("Detail.feedbackThanks"))} className={cn(fhBtn.primary, "mt-3")}>
            {t("Detail.feedbackSend")}
          </button>
        </section>
      )}

      <section className="rounded-[24px] border border-fline bg-white p-5">
        <label htmlFor="fh-comment" className="font-bold text-fink">{t("Detail.comment")}</label>
        <textarea id="fh-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("Detail.commentPh")} className={cn(fhInput, "mt-3")} maxLength={2000} />
        <button
          disabled={pending || comment.trim().length < 2}
          onClick={() => run(async () => { const r = await employeeCommentAction(reference, comment); if (r.ok) setComment(""); return r; })}
          className={cn(fhBtn.primary, "mt-3")}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 rtl:-scale-x-100" aria-hidden="true" />} {t("Detail.send")}
        </button>
      </section>

      {canCancel && (
        <button
          disabled={pending}
          onClick={() => confirm(t("Detail.cancelConfirm")) && run(() => employeeDecisionAction(reference, "cancel"))}
          className={fhBtn.danger}
        >
          {t("Detail.cancel")}
        </button>
      )}

      {msg && <p role="status" className={cn("rounded-2xl px-4 py-3 text-sm font-medium", msg.ok ? "bg-[#E8F9EF] text-[#1B6B3E]" : "bg-red-50 text-red-700")}>{msg.text}</p>}
    </div>
  );
}
