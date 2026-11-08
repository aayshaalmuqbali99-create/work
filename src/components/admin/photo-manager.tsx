"use client";

import { useActionState, useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Check, ImageOff, Trash2, Upload } from "lucide-react";
import { removePhotoAction, uploadPhotoAction, applyWorkbookPhotoAction } from "@/features/admin/device-actions";
import type { FormState } from "@/features/admin/schemas";
import { btnDanger, btnSecondary, inputCls } from "./ui";
import { cn } from "@/lib/utils";

type Photo = { src: string; width: number; height: number };

export function PhotoManager({
  id,
  current,
  currentSourcePhoto,
  suggestedPhoto,
  workbookPhotos,
}: {
  id: string;
  current: Photo | null;
  currentSourcePhoto: number | null;
  suggestedPhoto: number | null;
  workbookPhotos: Record<string, Photo>;
}) {
  const t = useTranslations("Admin");
  const [uploadState, uploadAction, uploading] = useActionState<FormState, FormData>(uploadPhotoAction, { ok: false });
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-navy">{t("currentPhoto")}</p>
        <div className="grid h-48 place-items-center rounded-xl border border-line bg-canvas">
          {current ? (
            <Image src={current.src} alt="" width={current.width} height={current.height} className="max-h-44 w-auto rounded object-contain" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm text-muted"><ImageOff className="size-8" />{t("noPhoto")}</span>
          )}
        </div>
        {currentSourcePhoto && <p className="mt-1 text-xs text-muted">{t("workbookPhoto", { n: currentSourcePhoto })}</p>}
      </div>

      <form action={uploadAction} className="space-y-2">
        <input type="hidden" name="id" value={id} />
        <p className="text-sm font-medium text-navy">{t("uploadPhoto")}</p>
        {/* Native file input is visually hidden so the button text follows the site language. */}
        <label htmlFor="file" className={cn(inputCls, "flex cursor-pointer items-center gap-3 focus-within:border-teal focus-within:ring-4 focus-within:ring-teal/10")}>
          <span className="shrink-0 rounded-full bg-teal-light px-3 py-1 text-xs font-semibold text-teal">{t("chooseFile")}</span>
          <span className="truncate text-muted">{fileName ?? t("noFile")}</span>
          <input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
        </label>
        <p className="text-xs text-muted">{t("uploadHelp")}</p>
        <button type="submit" disabled={uploading} className={btnSecondary}><Upload className="size-4" />{t("upload")}</button>
        {uploadState.message && (
          <p role="status" className={cn("text-sm", uploadState.ok ? "text-emerald-700" : "text-red-600")}>{t(uploadState.message)}</p>
        )}
      </form>

      <div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={btnSecondary}>{t("choosePhoto")}</button>
        {open && (
          <ul className="mt-3 grid max-h-[28rem] grid-cols-3 gap-2 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-4">
            {Object.entries(workbookPhotos).map(([n, p]) => {
              const num = Number(n);
              const isCurrent = num === currentSourcePhoto;
              return (
                <li key={n}>
                  <button
                    type="button"
                    disabled={pending || isCurrent}
                    onClick={() => start(async () => { await applyWorkbookPhotoAction(id, num); setOpen(false); })}
                    title={t("useThis")}
                    className={cn("relative flex w-full flex-col items-center gap-1 rounded-lg border p-1 text-[11px] transition hover:border-teal", isCurrent ? "border-teal bg-teal-light" : "border-line")}
                  >
                    <Image src={p.src} alt={`Photo ${n}`} width={p.width} height={p.height} className="h-20 w-auto object-contain" />
                    <span>{t("workbookPhoto", { n })}</span>
                    {num === suggestedPhoto && <span className="absolute start-1 top-1 rounded bg-amber-400 px-1 text-[10px] font-bold text-navy">{t("photoSuggested")}</span>}
                    {isCurrent && <Check className="absolute end-1 top-1 size-4 text-teal" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {current && (
        <button
          type="button"
          disabled={pending}
          onClick={() => { if (window.confirm(t("confirmRemovePhoto"))) start(async () => { await removePhotoAction(id); }); }}
          className={btnDanger}
        >
          <Trash2 className="size-4" />{t("removePhoto")}
        </button>
      )}
    </div>
  );
}
