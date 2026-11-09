import { getTranslations } from "next-intl/server";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HeroCarousel, type Slide } from "./hero-carousel";

export type HeroText = { eyebrow?: string; title?: string; subtitle?: string; showVisual: boolean };

/**
 * Homepage banner: full-width lab photo, navy fade behind the text, headline with an orange accent,
 * two actions, and a soft wave (blue → orange) leading into the highlights below.
 */
export async function Hero({ text, slides }: { text: HeroText; slides: Slide[] }) {
  const t = await getTranslations("Hero");
  const title = text.title || t("title");
  return (
    <section className="relative isolate overflow-hidden bg-[radial-gradient(120%_120%_at_85%_20%,#2a5f9e_0%,#0d2a52_60%)] text-white">
      {text.showVisual && slides.length > 0 && (
        <HeroCarousel
          slides={slides}
          alt={title}
          className="absolute inset-y-0 end-0 -z-10 w-full lg:w-[76%] lg:[mask-image:linear-gradient(to_left,#000_84%,transparent)] lg:rtl:[mask-image:linear-gradient(to_right,#000_84%,transparent)]"
        />
      )}
      {/* navy from the text side so the headline stays readable */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b2a5a]/90 via-[#0b2a5a]/45 to-transparent rtl:bg-gradient-to-l lg:from-[#0b2a5a]/70 lg:via-[#0b2a5a]/20" />

      <div className="mx-auto flex min-h-[520px] max-w-[1560px] items-center px-4 pb-36 pt-14 sm:px-6 lg:min-h-[560px] lg:px-14 lg:pb-36">
        <div className="ls-enter max-w-lg">
          <h1 className="border-s-4 border-amber-500 ps-5 text-[clamp(2.1rem,1.4rem+2.6vw,3.6rem)] font-bold leading-[1.15] tracking-tight drop-shadow-sm">{title}</h1>
          <p className="mt-6 max-w-lg text-xl leading-relaxed text-white/95 drop-shadow-sm">{text.subtitle || t("subtitle")}</p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/equipment"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-[#0a63e8] to-[#1b7cf5] px-8 py-3.5 font-semibold text-white shadow-lg shadow-[#0a63e8]/40 transition hover:brightness-110"
            >
              {t("browse")}
              <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
            </Link>
            <Link href="/about" className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/5 px-8 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/15">
              <PlayCircle className="size-5" aria-hidden="true" />
              {t("learn")}
            </Link>
          </div>
        </div>
      </div>

      {/* wave */}
      <svg aria-hidden="true" viewBox="0 0 1440 160" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[110px] w-full sm:h-[150px]">
        <defs>
          <linearGradient id="hero-wave-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#1b6fd1" />
            <stop offset="0.45" stopColor="#7fb2f0" stopOpacity="0.6" />
            <stop offset="0.75" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="hero-wave-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="1" stopColor="#f6f8fc" />
          </linearGradient>
        </defs>
        <path d="M0 40 C 260 120, 520 150, 820 110 S 1250 30, 1440 40 V160 H0 Z" fill="url(#hero-wave-fill)" />
        <path d="M0 40 C 260 120, 520 150, 820 110 S 1250 30, 1440 40" fill="none" stroke="url(#hero-wave-line)" strokeWidth="6" />
      </svg>
    </section>
  );
}
