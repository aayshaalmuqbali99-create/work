import { useTranslations } from "next-intl";
import { ArrowRight, Box, Cpu, Package } from "lucide-react";
import { getStats } from "@/features/catalog/data";
import { Link } from "@/i18n/navigation";
import { HeroVisual } from "./hero-visual";

export function Hero() {
  const t = useTranslations("Hero");
  const s = getStats();
  const stats = [
    { icon: Cpu, label: t("statDevices", { count: s.devices }) },
    { icon: Package, label: t("statUnits", { count: s.units }) },
    { icon: Box, label: t("stat3d") },
  ];
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_10%,rgba(22,125,131,0.12),transparent_70%)] rtl:bg-[radial-gradient(60%_60%_at_20%_10%,rgba(22,125,131,0.12),transparent_70%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-24">
        <div className="ls-enter">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal-light/60 px-3 py-1 text-xs font-semibold text-teal">
            <span className="size-1.5 rounded-full bg-teal" />
            {t("eyebrow")}
          </p>
          <h1 className="text-display font-bold tracking-tight text-navy">{t("title")}</h1>
          <p className="mt-6 max-w-xl text-lg text-muted">{t("subtitle")}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/equipment"
              className="group inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 font-semibold text-white shadow-lg shadow-navy/20 transition hover:bg-teal"
            >
              {t("browse")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
            </Link>
            <Link
              href="/#why"
              className="inline-flex items-center rounded-full border border-line bg-surface px-6 py-3 font-semibold text-navy transition hover:border-teal hover:text-teal"
            >
              {t("learn")}
            </Link>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted">
            {stats.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2">
                <Icon className="size-4 text-teal" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="ls-enter ls-enter-delay">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
