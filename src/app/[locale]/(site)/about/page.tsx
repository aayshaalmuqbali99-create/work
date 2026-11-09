import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, FlaskConical } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { GoalsSection } from "@/components/home/about-section";
import { StatsSection } from "@/components/home/stats-section";
import { LabIllustration } from "@/components/about/lab-illustration";
import { Reveal } from "@/components/home/reveal";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return { title: t("title"), description: t("lead"), alternates: { canonical: `/${locale}/about`, languages: { ar: "/ar/about", en: "/en/about" } } };
}

export const dynamic = "force-dynamic";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  return (
    <>
      {/* Intro */}
      <section className="relative isolate overflow-hidden bg-[#071423] text-white">
        <div aria-hidden="true" className="ls-hero-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="ls-float-slow absolute -top-40 end-1/4 -z-10 size-[460px] rounded-full bg-[#167d83]/30 blur-[120px]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div className="ls-enter">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-[#9fe7ea]">
              <FlaskConical className="size-4" aria-hidden="true" />
              {t("eyebrow")}
            </p>
            <h1 className="mt-5 text-display font-bold tracking-tight"><span className="ls-gradient-text">{t("title")}</span></h1>
            <p className="mt-6 text-xl leading-relaxed text-white/85">{t("lead")}</p>
            <p className="mt-5 leading-relaxed text-white/70">{t("body1")}</p>
            <p className="mt-6 border-s-4 border-[#3FB8BE] ps-4 font-medium text-white">{t("body2")}</p>
          </div>
          <figure className="ls-enter ls-enter-delay">
            <div className="overflow-hidden rounded-[28px] border border-white/10 shadow-2xl shadow-black/40">
              <LabIllustration title={t("illustration")} />
            </div>
            <figcaption className="mt-3 text-center text-sm text-white/70">
              <span className="font-semibold text-white">{t("inLab")}</span> — {t("inLabText")}
              <span className="mt-1 block text-xs text-white/50">{t("photosSoon")}</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <GoalsSection />
      <StatsSection />

      {/* Call to action */}
      <section className="py-16">
        <Reveal className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-4 rounded-[28px] bg-gradient-to-br from-[#167d83] to-[#1b6fd1] p-10 text-center text-white shadow-xl">
            <h2 className="text-2xl font-bold">{t("ctaTitle")}</h2>
            <p className="text-white/85">{t("ctaText")}</p>
            <Link href="/equipment" className="group mt-2 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-navy transition hover:bg-[#d6e9e8]">
              {t("cta")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
