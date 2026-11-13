import Image from "next/image";

/**
 * Official Omantel logotype, exactly as supplied in the brand guidelines (never redrawn, recoloured,
 * stretched, animated or given effects). Arabic interface → bilingual logotype; English → Latin logotype,
 * as the guidelines prescribe. `reverse` is the official white version for Deep Sea / dark backgrounds.
 * The wrapper keeps clear space around the artwork.
 */
const LOGOS = {
  ar: { src: "/brand/omantel/omantel-bilingual.png", rev: "/brand/omantel/omantel-bilingual-reverse.png", w: 907, h: 400 },
  en: { src: "/brand/omantel/omantel-latin.png", rev: "/brand/omantel/omantel-latin-reverse.png", w: 802, h: 160 },
} as const;

export function OmantelLogo({ locale, reverse = false, height, className, priority }: { locale: string; reverse?: boolean; height?: number; className?: string; priority?: boolean }) {
  const l = LOGOS[locale === "ar" ? "ar" : "en"];
  const h = height ?? (locale === "ar" ? 40 : 22);
  return (
    <Image
      src={reverse ? l.rev : l.src}
      alt={locale === "ar" ? "عُمانتل" : "Omantel"}
      width={l.w}
      height={l.h}
      priority={priority}
      className={className}
      style={{ height: h, width: "auto" }}
    />
  );
}
