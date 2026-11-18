import { cn } from "@/lib/utils";

/**
 * The Omantel logo exactly as supplied: original colours and proportions (height only, width follows),
 * no filter, opacity, shadow, rotation or effect. On a dark background, a version without a reversed file sits on
 * a solid white plate. Padding keeps clear space around it.
 */
export function OmantelLogo({ src, onDark = false, plate = false, className }: { src: string; onDark?: boolean; plate?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", plate && !onDark && "rounded-md bg-white px-2.5 py-1.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- official artwork must be served untouched (no re-encoding) */}
      <img src={src} alt="Omantel" className="brand-logo h-full w-auto object-contain" />
    </span>
  );
}
