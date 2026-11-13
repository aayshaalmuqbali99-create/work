"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { processOutboxAction, purgeSampleRequestsAction } from "@/features/facility/actions/ops";
import { fhBtn } from "../ui";

export function PurgeSampleButton() {
  const t = useTranslations("Fac.Ops");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className={fhBtn.danger}
      disabled={pending}
      onClick={() => confirm(t("purgeConfirm")) && start(async () => { await purgeSampleRequestsAction(); router.refresh(); })}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" aria-hidden="true" />} {t("purgeSample")}
    </button>
  );
}

export function ProcessOutboxButton() {
  const t = useTranslations("Fac.Ops.config");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button className={fhBtn.secondary} disabled={pending} onClick={() => start(async () => { await processOutboxAction(); router.refresh(); })}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" aria-hidden="true" />} {t("processNow")}
    </button>
  );
}
