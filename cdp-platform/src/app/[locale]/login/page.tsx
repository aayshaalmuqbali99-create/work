import { Suspense } from "react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { omantelLogo } from "@/lib/brand-logo";
import { OmantelLogo } from "@/components/layout/omantel-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getCurrentUser()) redirect({ href: "/", locale: await getLocale() });
  const t = await getTranslations("Admin");
  const tc = await getTranslations("Cdp");
  const tb = await getTranslations("Brand");
  const logo = omantelLogo(locale);
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          {logo ? <OmantelLogo src={logo.src} className="h-12" /> : <span className="text-xl font-bold text-navy">Omantel</span>}
          <LanguageSwitcher />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy" lang="en" dir="ltr">Omantel | CDP Programme Evaluation 2026</p>
        <div className="rounded-card border border-line bg-surface p-6 shadow-xl shadow-navy/5">
          <h1 className="mb-1 text-xl font-bold text-navy">{t("loginTitle")}</h1>
          <p className="mb-6 text-sm text-muted">{tc("platformName")}</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm font-bold text-navy" lang="en" dir="ltr">{tb("omantelTagline")}</p>
      </div>
    </main>
  );
}
