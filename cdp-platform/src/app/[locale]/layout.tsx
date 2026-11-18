import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, localeDirection } from "@/i18n/routing";
import { brandFontCss } from "@/lib/brand-fonts";
import "../globals.css";

// Fallbacks for the licensed brand fonts (FS Alvar / FS Albert), at the brand weights only: Light, Regular, Bold.
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "700"], variable: "--font-inter", display: "swap" });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["300", "400", "700"], variable: "--font-plex-arabic", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Cdp" });
  return { title: { default: t("metaTitle"), template: `%s · Omantel CDP 2026` }, robots: { index: false, follow: false } };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Cdp");
  const fontCss = brandFontCss();
  return (
    <html lang={locale} dir={localeDirection[locale]} className={`${inter.variable} ${plexArabic.variable}`}>
      {fontCss ? (
        <head>
          <style dangerouslySetInnerHTML={{ __html: fontCss }} />
        </head>
      ) : null}
      {/* Omantel Brand Guidelines 2024 apply to the whole platform (tokens in globals.css under .omantel-brand) */}
      <body className="omantel-brand flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-white">
            {t("skip")}
          </a>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
