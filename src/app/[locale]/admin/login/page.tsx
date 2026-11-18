import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/layout/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LoginForm } from "@/components/admin/login-form";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getCurrentUser()) redirect({ href: "/admin", locale: await getLocale() });
  const t = await getTranslations("Admin");
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <LanguageSwitcher />
        </div>
        <div className="ls-enter rounded-card border border-line bg-surface p-6 shadow-xl shadow-navy/5">
          <h1 className="mb-6 text-xl font-bold text-navy">{t("loginTitle")}</h1>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
