import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/layout/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AccessForm } from "@/components/layout/access-form";

export const metadata: Metadata = { robots: { index: false, follow: false } };
/** Rendered per request (reads site settings from the database, never at build time). */
export const dynamic = "force-dynamic";

export default async function AccessPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Access");
  const { next } = await searchParams;
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <LanguageSwitcher />
        </div>
        <div className="ls-enter rounded-card border border-line bg-surface p-6 shadow-xl shadow-navy/5">
          <h1 className="text-xl font-bold text-navy">{t("title")}</h1>
          <p className="mb-6 mt-2 text-sm text-muted">{t("intro")}</p>
          <AccessForm locale={locale} next={next ?? `/${locale}`} />
        </div>
      </div>
    </main>
  );
}
