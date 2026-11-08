import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/hero";
import { CategoriesSection } from "@/components/home/categories-section";
import { FeaturedSection } from "@/components/home/featured-section";
import { WhySection, HowSection } from "@/components/home/why-section";

/** Rendered per request from the cached catalogue (refreshed when the admin saves). */
export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Hero />
      <FeaturedSection />
      <CategoriesSection />
      <WhySection />
      <HowSection />
    </>
  );
}
