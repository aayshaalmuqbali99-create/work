import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { omantelLogo } from "@/lib/brand-logo";
import { brandFontCss } from "@/lib/brand-fonts";
import { OmantelLogo } from "@/components/layout/omantel-logo";
import { LogOut } from "lucide-react";
import { getSiteContent } from "@/features/site/data";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/features/admin/auth-actions";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Cdp" });
  return { title: { absolute: t("metaTitle") }, robots: { index: false, follow: false } };
}

/** Internal results platform: its own header (Omantel identity), no public website navigation. */
export default async function CdpLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Cdp");
  const { site } = await getSiteContent();
  const user = await getCurrentUser();
  const fontCss = brandFontCss();
  const logo = omantelLogo(await getLocale(), site.brand.partnerLogoUrl);
  return (
    // Omantel Brand Guidelines 2024 apply to the CDP platform only (scoped by .omantel-brand in globals.css).
    <div className="omantel-brand flex min-h-dvh flex-col bg-surface">
      {fontCss ? <style dangerouslySetInnerHTML={{ __html: fontCss }} /> : null}
      <header className="cdp-chrome border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          {logo ? (
            <OmantelLogo src={logo.src} className="h-10 sm:h-12" />
          ) : (
            <span className="text-xl font-bold text-navy">Omantel</span>
          )}
          <span className="hidden h-10 w-px bg-line sm:block" aria-hidden="true" />
          <div className="order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy rtl:text-end sm:rtl:text-start" lang="en" dir="ltr">Omantel | CDP Programme Evaluation 2026</p>
            <p className="truncate text-sm font-medium text-navy sm:text-base">{t("platformName")}</p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher />
            {user && (
              <form action={logoutAction} className="cdp-hide-present">
                <button type="submit" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted hover:bg-canvas hover:text-navy" title={user.name}>
                  <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("logout")}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
