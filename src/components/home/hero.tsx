import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { getDevices } from "@/features/catalog/data";
import { Link } from "@/i18n/navigation";
import { HeroCarousel, type Slide } from "./hero-carousel";

export type HeroText = { eyebrow?: string; title?: string; subtitle?: string; showVisual: boolean };

/** Full-width photo banner with a navy gradient, headline with an orange accent, two actions and slide dots. */
export async function Hero({ text, slides }: { text: HeroText; slides: Slide[] }) {
  const t = await getTranslations("Hero");
  const th = await getTranslations("Home");
  const locale = (await getLocale()) as "ar" | "en";
  const names = (await getDevices(locale)).map((d) => d.name);
  const ticker = [...names, ...names];
  const title = text.title || t("title");
  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#0b1d38] text-white">
        {text.showVisual && slides.length > 0 && (
          <HeroCarousel
            slides={slides}
            alt={title}
            className="absolute inset-y-0 end-0 -z-10 w-full lg:w-[70%] lg:[mask-image:linear-gradient(to_left,#000_86%,transparent)] lg:rtl:[mask-image:linear-gradient(to_right,#000_86%,transparent)]"
          />
        )}
        {/* navy from the text side so the headline stays readable over any photo */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b1d38] via-[#0b1d38]/80 to-transparent rtl:bg-gradient-to-l lg:via-[#0b1d38]/45 lg:to-[#0b1d38]/0" />

        <div className="mx-auto flex min-h-[420px] max-w-7xl items-center px-4 py-12 sm:px-6 lg:min-h-[300px] lg:py-8 lg:px-8">
          <div className="ls-enter max-w-md">
            <h1 className="border-s-4 border-amber-500 ps-5 text-[clamp(2rem,1.3rem+1.9vw,2.6rem)] font-bold leading-[1.2] tracking-tight drop-shadow-sm">
              {title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-white/90">{text.subtitle || t("subtitle")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/equipment"
                className="group inline-flex items-center gap-2 rounded-full bg-[#1b6fd1] px-7 py-3.5 font-semibold text-white shadow-lg shadow-[#1b6fd1]/40 transition hover:bg-[#2b7ff0]"
              >
                {t("browse")}
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
              </Link>
              <Link href="/about" className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/5 px-7 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/15">
                <PlayCircle className="size-5" aria-hidden="true" />
                {t("learn")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* moving ticker of available equipment */}
      {ticker.length > 0 && (
        <div className="ls-marquee-wrap border-b border-line bg-surface py-3">
          <div className="flex items-center gap-4 overflow-hidden">
            <span className="z-10 shrink-0 bg-surface pe-3 ps-4 text-xs font-bold uppercase tracking-wide text-[#1b6fd1] sm:ps-8">{th("tickerLabel")}</span>
            <ul className="ls-marquee flex w-max shrink-0 gap-8 text-sm text-muted" aria-hidden="true">
              {ticker.map((n, i) => (
                <li key={i} className="flex items-center gap-8 whitespace-nowrap">
                  {n}
                  <span className="size-1.5 rounded-full bg-amber-500/70" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
