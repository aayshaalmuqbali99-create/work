"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { uploadModelAction } from "@/features/admin/model-actions";
import type { FormState } from "@/features/admin/schemas";
import { btnPrimary, inputCls } from "./ui";
import { cn } from "@/lib/utils";

export function ModelUpload({ deviceId }: { deviceId: string }) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(uploadModelAction, { ok: false });
  const [fileName, setFileName] = useState<string | null>(null);
  useEffect(() => {
    if (state.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="deviceId" value={deviceId} />
      <p className="text-sm font-medium text-navy">{t("uploadModel")}</p>
      <label htmlFor="glb" className={cn(inputCls, "flex cursor-pointer items-center gap-3 focus-within:border-teal focus-within:ring-4 focus-within:ring-teal/10")}>
        <span className="shrink-0 rounded-full bg-teal-light px-3 py-1 text-xs font-semibold text-teal">{t("chooseFile")}</span>
        <span className="truncate text-muted" dir="ltr">{fileName ?? t("noFile")}</span>
        <input id="glb" name="file" type="file" accept=".glb,model/gltf-binary" required className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
      </label>
      <p className="text-xs text-muted">{t("uploadModelHelp")}</p>
      <button type="submit" disabled={pending} className={btnPrimary}><Upload className="size-4" />{pending ? t("saving") : t("upload")}</button>
      {state.message && !state.ok && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{t(state.message)}</p>}
    </form>
  );
}
