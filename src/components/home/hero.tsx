import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Box, Cpu, GraduationCap, Package } from "lucide-react";
import { getDevices, getStats } from "@/features/catalog/data";
import { Link } from "@/i18n/navigation";
import { HeroModel } from "./hero-model";

export type HeroText = { eyebrow?: string; title?: string; subtitle?: string; showVisual: boolean };

export async function Hero({ text }: { text: HeroText }) {
  const t = await getTranslations("Hero");
  const th = await getTranslations("Home");
  const locale = (await getLocale()) as "ar" | "en";
  const s = await getStats();
  const names = (await getDevices(locale)).map((d) => d.name);
  const ticker = [...names, ...names];
  const stats = [
    { icon: Cpu, label: t("statDevices", { count: s.devices }) },
    { icon: Package, label: t("statUnits", { count: s.units }) },
    { icon: Box, label: t("stat3d") },
  ];
  return (
    <section className="relative isolate overflow-hidden bg-[#071423] text-white">
      {/* background: moving grid + glows */}
      <div aria-hidden="true" className="ls-hero-grid absolute inset-0 -z-10" />
      <div aria-hidden="true" className="ls-float-slow absolute -top-40 start-1/3 -z-10 size-[520px] rounded-full bg-[#167d83]/30 blur-[120px]" />
      <div aria-hidden="true" className="ls-float absolute -bottom-48 end-0 -z-10 size-[460px] rounded-full bg-[#1b6fd1]/25 blur-[120px]" />

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pb-20 lg:pt-20">
        <div className="ls-enter">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-[#9fe7ea] backdrop-blur">
            <GraduationCap className="size-4" aria-hidden="true" />
            {text.eyebrow || t("eyebrow")}
          </p>
          <h1 className="text-display font-bold tracking-tight">
            <span className="ls-gradient-text">{text.title || t("title")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">{text.subtitle || t("subtitle")}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/equipment"
              className="group inline-flex items-center gap-2 rounded-full bg-[#3FB8BE] px-6 py-3 font-semibold text-[#071423] shadow-lg shadow-[#3FB8BE]/30 transition hover:bg-white"
            >
              {t("browse")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
            </Link>
            <Link href="/about" className="inline-flex items-center rounded-full border border-white/25 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur transition hover:border-white/60">
              {t("learn")}
            </Link>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/70">
            {stats.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2">
                <Icon className="size-4 text-[#3FB8BE]" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
        {text.showVisual && (
          <div className="ls-enter ls-enter-delay relative">
            <div className="relative rounded-[28px] border border-white/10 bg-white/[0.03] p-2 shadow-2xl shadow-black/40 backdrop-blur">
              <HeroModel locale={locale} />
            </div>
            <span className="ls-float absolute -start-3 top-8 hidden rounded-2xl border border-white/15 bg-[#0b2238]/90 px-4 py-2 text-sm font-semibold shadow-xl backdrop-blur lg:block">
              <Box className="me-1.5 inline size-4 text-[#3FB8BE]" aria-hidden="true" />3D
            </span>
          </div>
        )}
      </div>

      {/* moving ticker of available equipment */}
      {ticker.length > 0 && (
        <div className="ls-marquee-wrap border-t border-white/10 bg-white/[0.03] py-3">
          <div className="flex items-center gap-4 overflow-hidden">
            <span className="z-10 shrink-0 bg-[#0b1d30] ps-4 pe-3 text-xs font-bold uppercase tracking-wide text-[#3FB8BE] sm:ps-8">{th("tickerLabel")}</span>
            <ul className="ls-marquee flex w-max shrink-0 gap-8 text-sm text-white/70" aria-hidden="true">
              {ticker.map((n, i) => (
                <li key={i} className="flex items-center gap-8 whitespace-nowrap">
                  {n}
                  <span className="size-1.5 rounded-full bg-[#3FB8BE]/60" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
