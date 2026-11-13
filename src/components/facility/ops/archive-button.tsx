"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { archiveConfigAction } from "@/features/facility/actions/config";

/** Archive / restore a location record (nothing is deleted; request history is kept). */
export function ArchiveButton({ entity, id, archived }: { entity: "floor" | "wing" | "area" | "location" | "areaCategory"; id: string; archived: boolean }) {
  const t = useTranslations("Fac.Ops.config");
  const router = useRouter();
  const [pending, start] = useTransition();
  const label = archived ? t("restore") : t("archive");
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={pending}
      onClick={() => start(async () => { await archiveConfigAction(entity, id, !archived); router.refresh(); })}
      className="grid size-9 place-items-center rounded-full text-fmuted transition hover:bg-lav-100 hover:text-deep disabled:opacity-30"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
    </button>
  );
}
