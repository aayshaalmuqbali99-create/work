"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import type { ModelStatus } from "@prisma/client";
import { Link } from "@/i18n/navigation";
import { deleteModelAction, publishModelAction, unpublishModelAction } from "@/features/admin/model-actions";
import type { FormState } from "@/features/admin/schemas";
import { btnDanger, btnPrimary, btnSecondary } from "./ui";

export function ModelVersionActions({ id, deviceId, status }: { id: string; deviceId: string; status: ModelStatus }) {
  const t = useTranslations("Admin");
  const [pending, start] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [msg, setMsg] = useState<FormState | null>(null);
  const run = (fn: () => Promise<FormState>) => start(async () => setMsg(await fn()));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/admin/devices/${deviceId}/models/${id}`} className={btnSecondary}><Pencil className="size-4" />{t("editParts")}</Link>
        {status === "PUBLISHED" ? (
          <button type="button" disabled={pending} className={btnSecondary} onClick={() => run(() => unpublishModelAction(id))}><EyeOff className="size-4" />{t("unpublishModel")}</button>
        ) : (
          <button type="button" disabled={pending} className={btnDanger} onClick={() => window.confirm(t("confirmDeleteModel")) && run(() => deleteModelAction(id))}><Trash2 className="size-4" />{t("deleteModel")}</button>
        )}
      </div>
      {status !== "PUBLISHED" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-canvas p-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="size-4 accent-[#167d83]" />
            {t("verifyConfirm")}
          </label>
          <button type="button" disabled={pending || !confirmed} className={btnPrimary} onClick={() => run(() => publishModelAction(id, confirmed))}><Eye className="size-4" />{t("publishModel")}</button>
        </div>
      )}
      {msg?.message && <p role="status" className={msg.ok ? "text-sm text-emerald-700" : "text-sm text-red-600"}>{t(msg.message)}</p>}
    </div>
  );
}
