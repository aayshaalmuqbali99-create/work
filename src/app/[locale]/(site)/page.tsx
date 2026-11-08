import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/hero";
import { CategoriesSection } from "@/components/home/categories-section";
import { FeaturedSection } from "@/components/home/featured-section";
import { WhySection, HowSection } from "@/components/home/why-section";
import type { SectionText } from "@/components/home/types";
import { getSiteContent, pick } from "@/features/site/data";
import type { SectionKey } from "@/features/site/schema";

/** Rendered per request from cached content (refreshed when the admin publishes). */
export const dynamic = "force-dynamic";

const SECTIONS: Record<SectionKey, (p: { text: SectionText }) => React.ReactNode> = {
  featured: (p) => <FeaturedSection {...p} />,
  categories: (p) => <CategoriesSection {...p} />,
  why: (p) => <WhySection {...p} />,
  how: (p) => <HowSection {...p} />,
};

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { site } = await getSiteContent();
  const h = site.hero as unknown as Record<string, unknown>;
  return (
    <>
      <Hero text={{ eyebrow: pick(h, "eyebrow", locale, ""), title: pick(h, "title", locale, ""), subtitle: pick(h, "subtitle", locale, ""), showVisual: site.hero.showVisual }} />
      {site.sections
        .filter((s) => s.enabled)
        .map((s) => {
          const o = s as unknown as Record<string, unknown>;
          return <div key={s.key}>{SECTIONS[s.key]({ text: { title: pick(o, "title", locale, ""), subtitle: pick(o, "subtitle", locale, "") } })}</div>;
        })}
    </>
  );
}
