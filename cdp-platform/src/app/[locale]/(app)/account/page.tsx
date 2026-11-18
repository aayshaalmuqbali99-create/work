import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/auth/page";
import { Card } from "@/components/ui";
import { PasswordForm } from "@/components/auth/password-form";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageUser();
  const t = await getTranslations("Admin");
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold text-navy">{t("accountTitle")}</h1>
      <Card>
        <p className="font-bold text-ink">{user.name}</p>
        <p className="text-sm text-muted" dir="ltr">{user.email}</p>
        <p className="mt-1 text-sm text-muted">{t(`role_${user.role}`)}</p>
      </Card>
      <Card title={t("changePassword")}>
        <PasswordForm />
      </Card>
    </main>
  );
}
