import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/** Every Facility Hub page depends on the signed-in user: never prerender or cache it. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Fac.Brand" });
  return {
    title: { default: t("full"), template: `%s · ${t("full")}` },
    description: t("tagline"),
    // Internal platform: never indexed.
    robots: { index: false, follow: false },
    alternates: { languages: { ar: "/ar/facility", en: "/en/facility" } },
  };
}

export default function FacilityLayout({ children }: { children: React.ReactNode }) {
  return <div className="fh flex min-h-dvh flex-1 flex-col">{children}</div>;
}
