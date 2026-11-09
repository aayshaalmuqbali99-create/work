import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, localeDirection } from "@/i18n/routing";
import { MotionProvider } from "@/components/layout/motion-provider";
import { getSiteContent } from "@/features/site/data";
import { SITE_URL } from "@/lib/site-url";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: `%s · ${locale === "ar" ? "أصول عُمانتل" : "Omantel Assets"}` },
    description: t("description"),
    alternates: { canonical: `/${locale}`, languages: { ar: "/ar", en: "/en" } },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Nav");
  const { site } = await getSiteContent();
  // Brand colours from the website editor override the default design tokens.
  const themeVars = {
    "--ls-navy": site.theme.navy,
    "--ls-teal": site.theme.teal,
    "--ls-teal-light": site.theme.tealLight,
    "--ls-bg": site.theme.background,
    "--ls-radius": `${site.theme.radius}px`,
  } as React.CSSProperties;

  return (
    <html
      lang={locale}
      dir={localeDirection[locale]}
      className={`${inter.variable} ${plexArabic.variable}`}
      style={themeVars}
      data-motion={site.theme.animations ? "on" : "off"}
    >
      <body className="min-h-dvh flex flex-col">
        <NextIntlClientProvider>
          <MotionProvider animations={site.theme.animations}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
            >
              {t("skip")}
            </a>
            {children}
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
