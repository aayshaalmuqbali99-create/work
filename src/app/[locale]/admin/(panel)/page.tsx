import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle, ClipboardCheck, Cpu, FileEdit, Package, Boxes } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getDashboard } from "@/features/admin/queries";
import { Card } from "@/components/admin/ui";
import { ActivityList } from "@/components/admin/activity-list";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");
  const format = await getFormatter();
  const d = await getDashboard();
  const kpis = [
    { label: t("kpiPublished"), value: d.published, icon: Cpu, href: "/admin/devices?status=PUBLISHED" },
    { label: t("kpiUnits"), value: d.publishedUnits, icon: Package },
    { label: t("kpiReview"), value: d.review, icon: ClipboardCheck, href: "/admin/devices?status=REVIEW", warn: d.review > 0 },
    { label: t("kpiDraft"), value: d.draft, icon: FileEdit, href: "/admin/devices?status=DRAFT" },
    { label: t("kpiAllUnits"), value: d.allUnits, icon: Boxes },
    { label: t("kpiUnverified"), value: d.unverified, icon: AlertTriangle, warn: d.unverified > 0 },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">{t("dashTitle")}</h1>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map(({ label, value, icon: Icon, href, warn }) => {
          const body = (
            <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-5 transition hover:border-teal/40">
              <span className={`grid size-11 place-items-center rounded-xl ${warn ? "bg-amber-100 text-amber-700" : "bg-teal-light text-teal"}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-2xl font-bold text-navy" dir="ltr">{format.number(value)}</p>
                <p className="text-sm text-muted">{label}</p>
              </div>
            </div>
          );
          return <li key={label}>{href ? <Link href={href}>{body}</Link> : body}</li>;
        })}
      </ul>
      <Card title={t("recent")} actions={<Link href="/admin/activity" className="text-sm font-medium text-teal">{t("navActivity")}</Link>}>
        <ActivityList entries={d.recent} locale={locale} compact />
      </Card>
    </div>
  );
}
