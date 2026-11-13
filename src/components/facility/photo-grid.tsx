"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

/** Thumbnails with an accessible lightbox. Images come from the authorised attachment route. */
export function PhotoGrid({ photos }: { photos: { id: string; width: number; height: number }[] }) {
  const t = useTranslations("Fac.Common");
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => setOpen(p.id)} className="block aspect-square w-full overflow-hidden rounded-2xl bg-lav-50 transition hover:opacity-90">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/facility/attachments/${p.id}`} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 grid place-items-center bg-[rgb(16_6_70/0.85)] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} src={`/api/facility/attachments/${open}`} alt="" className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
            <button autoFocus type="button" onClick={() => setOpen(null)} className="absolute end-4 top-4 grid size-11 place-items-center rounded-full bg-white text-fink" aria-label={t("close")}>
              <X className="size-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
