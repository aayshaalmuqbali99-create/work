"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, Printer, RefreshCw } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { regenerateQrAction } from "@/features/facility/actions/config";

export function QrCardActions({ areaId }: { areaId: string }) {
  const t = useTranslations("Fac.Ops.config");
  const router = useRouter();
  const [pending, start] = useTransition();
  const cls = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-deep hover:bg-lav-50";
  return (
    <div className="fh-noprint mt-3 flex flex-wrap justify-center gap-1">
      <a href={`/api/facility/qr/${areaId}`} className={cls}><Download className="size-3.5" /> {t("download")}</a>
      <button className={cls} disabled={pending} onClick={() => confirm(t("regenerateConfirm")) && start(async () => { await regenerateQrAction(areaId); router.refresh(); })}>
        <RefreshCw className="size-3.5" /> {t("regenerate")}
      </button>
    </div>
  );
}

export function PrintButton() {
  const t = useTranslations("Fac.Ops.config");
  return (
    <button onClick={() => window.print()} className="fh-noprint inline-flex min-h-10 items-center gap-2 rounded-full border border-fline bg-white px-4 text-sm font-semibold text-deep hover:bg-lav-50">
      <Printer className="size-4" /> {t("print")}
    </button>
  );
}
