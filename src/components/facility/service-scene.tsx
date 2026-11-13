/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/**
 * Small animated 3D scene for a service (Microsoft Fluent 3D emoji, MIT licence).
 * Maintenance: a slowly turning gear with a wrench "tightening" in front.
 * Cleaning: a sponge gently bobbing while bubbles rise and sparkles twinkle.
 * Pure CSS animation; it stops under prefers-reduced-motion (see globals.css).
 */
export function ServiceScene({ kind, className }: { kind: "maintenance" | "cleaning"; className?: string }) {
  const img = "pointer-events-none absolute select-none drop-shadow-[0_10px_14px_rgb(29_10_120/0.18)]";
  return (
    <span className={cn("fh-scene relative block overflow-hidden", className)} aria-hidden="true">
      {kind === "maintenance" ? (
        <>
          <img src="/facility/3d/gear.webp" alt="" className={cn(img, "fh-a-spin start-[8%] top-[8%] w-[62%]")} />
          <img src="/facility/3d/gear.webp" alt="" className={cn(img, "fh-a-spin-rev end-[6%] top-[4%] w-[30%] opacity-90")} />
          <img src="/facility/3d/wrench.webp" alt="" className={cn(img, "fh-a-tighten bottom-[6%] end-[8%] w-[64%]")} />
        </>
      ) : (
        <>
          <img src="/facility/3d/bubbles.webp" alt="" className={cn(img, "fh-a-rise start-[10%] top-[30%] w-[34%]")} />
          <img src="/facility/3d/bubbles.webp" alt="" className={cn(img, "fh-a-rise fh-delay-2 end-[14%] top-[40%] w-[26%]")} />
          <img src="/facility/3d/sponge.webp" alt="" className={cn(img, "fh-a-bob bottom-[8%] start-[18%] w-[66%]")} />
          <img src="/facility/3d/sparkles.webp" alt="" className={cn(img, "fh-a-twinkle end-[6%] top-[6%] w-[36%]")} />
        </>
      )}
    </span>
  );
}

/** Static single icon for compact places (e.g. the form's service buttons). */
export function ServiceIcon({ kind, className }: { kind: "maintenance" | "cleaning"; className?: string }) {
  return (
    <img
      src={kind === "maintenance" ? "/facility/3d/wrench.webp" : "/facility/3d/sponge.webp"}
      alt=""
      aria-hidden="true"
      className={cn("pointer-events-none select-none", className)}
    />
  );
}
