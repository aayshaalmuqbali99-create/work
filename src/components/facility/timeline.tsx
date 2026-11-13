import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, CheckCircle2, CircleDot, Flag, Lock, MessageSquare, Star, UserCheck, Camera } from "lucide-react";
import type { FacRequestEvent } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatDate } from "@/features/facility/format";

const ICON = { STATUS: CircleDot, COMMENT: MessageSquare, ASSIGN: UserCheck, PRIORITY: Flag, ESCALATE: ArrowUpRight, FEEDBACK: Star, PHOTO: Camera } as const;

/** Animated vertical timeline. Pass only events the viewer may see (employees never get internal notes). */
export async function Timeline({ events, showInternal = false }: { events: FacRequestEvent[]; showInternal?: boolean }) {
  const t = await getTranslations("Fac");
  const locale = await getLocale();
  const list = [...events].reverse();
  return (
    <ol className="relative space-y-1">
      {list.map((e, i) => {
        const Icon = e.status === "RESOLVED" || e.status === "CLOSED" ? CheckCircle2 : ICON[e.type as keyof typeof ICON] ?? CircleDot;
        const data = (e.data ?? {}) as Record<string, unknown>;
        const team = locale === "ar" ? (data.teamAr as string) : (data.teamEn as string);
        const actor = e.actorRole === "SYSTEM" ? t("Detail.system") : e.actorName;
        const title =
          e.type === "STATUS" && e.status ? t(`Status.${e.status}`)
          : e.type === "ASSIGN" ? `${t("Detail.events.ASSIGN")}${team ? `: ${team}` : ""}`
          : e.type === "PRIORITY" ? `${t("Detail.events.PRIORITY")}: ${t(`Priority.${data.to as "LOW"}`)}`
          : e.type === "FEEDBACK" ? `${t("Detail.events.FEEDBACK")} · ${t("Detail.rating", { n: Number(data.rating ?? 0) })}`
          : t(`Detail.events.${e.type as "COMMENT"}`);
        return (
          <li key={e.id} className="fh-rise relative flex gap-4 pb-6" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
            {i < list.length - 1 && <span className="absolute start-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5 bg-lav-100" aria-hidden="true" />}
            <span
              className={cn(
                "relative z-10 grid size-10 shrink-0 place-items-center rounded-full ring-4 ring-white",
                i === 0 ? "bg-deep text-white" : e.internal ? "bg-[#FFF8E0] text-[#7A5A00]" : "bg-lav-50 text-deep",
              )}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 pt-1.5">
              <p className="flex flex-wrap items-center gap-2 font-bold text-fink">
                {title}
                {showInternal && e.internal && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF8E0] px-1.5 py-0.5 text-[11px] font-semibold text-[#7A5A00]">
                    <Lock className="size-3" aria-hidden="true" /> {t("Ops.detail.internal").split(" (")[0]}
                  </span>
                )}
              </p>
              <p className="text-xs text-fmuted">
                <time dateTime={e.createdAt.toISOString()}>{formatDate(e.createdAt, locale, true)}</time> · {t("Detail.by", { name: actor })}
              </p>
              {e.comment && <p className="mt-2 whitespace-pre-line rounded-2xl bg-lav-50/70 px-4 py-3 text-sm text-fink">{e.comment}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
