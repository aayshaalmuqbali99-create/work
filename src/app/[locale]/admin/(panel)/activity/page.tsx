import { getTranslations, setRequestLocale } from "next-intl/server";
import { listActivity } from "@/features/admin/queries";
import { ActivityList } from "@/components/admin/activity-list";
import { Card } from "@/components/admin/ui";

export default async function ActivityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");
  const entries = await listActivity(200);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-navy">{t("activityTitle")}</h1>
      <Card><ActivityList entries={entries} locale={locale} /></Card>
    </div>
  );
}
