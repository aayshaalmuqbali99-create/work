"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Archive, Eye, EyeOff, RotateCcw } from "lucide-react";
import type { DeviceStatus } from "@prisma/client";
import { setDeviceStatusAction } from "@/features/admin/device-actions";
import { btnDanger, btnPrimary, btnSecondary } from "./ui";

export function StatusControls({ id, status }: { id: string; status: DeviceStatus }) {
  const t = useTranslations("Admin");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (next: DeviceStatus, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const r = await setDeviceStatusAction(id, next);
      setMessage(r.ok ? null : { ok: false, text: t(r.message ?? "forbidden") });
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status !== "PUBLISHED" && status !== "ARCHIVED" && (
          <button type="button" disabled={pending} onClick={() => run("PUBLISHED")} className={btnPrimary}>
            <Eye className="size-4" aria-hidden="true" />{t("publish")}
          </button>
        )}
        {status === "PUBLISHED" && (
          <button type="button" disabled={pending} onClick={() => run("DRAFT")} className={btnSecondary}>
            <EyeOff className="size-4" aria-hidden="true" />{t("unpublish")}
          </button>
        )}
        {status === "ARCHIVED" ? (
          <button type="button" disabled={pending} onClick={() => run("DRAFT")} className={btnSecondary}>
            <RotateCcw className="size-4" aria-hidden="true" />{t("restore")}
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => run("ARCHIVED", t("confirmArchive"))} className={btnDanger}>
            <Archive className="size-4" aria-hidden="true" />{t("archive")}
          </button>
        )}
      </div>
      {message && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{message.text}</p>}
    </div>
  );
}
