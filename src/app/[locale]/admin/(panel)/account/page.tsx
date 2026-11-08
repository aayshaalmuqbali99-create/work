import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/features/admin/queries";
import { PasswordForm } from "@/components/admin/password-form";
import { Card } from "@/components/admin/ui";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageUser();
  const t = await getTranslations("Admin");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-navy">{t("accountTitle")}</h1>
      <Card>
        <dl className="grid gap-2 text-sm sm:grid-cols-[160px_1fr]">
          <dt className="text-muted">{t("email")}</dt><dd dir="ltr" className="text-start">{user.email}</dd>
        </dl>
      </Card>
      <Card title={t("changePassword")}><PasswordForm /></Card>
    </div>
  );
}
