import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requirePageUser } from "@/features/admin/queries";
import { listDatasets } from "@/features/cdp/data";
import { Card } from "@/components/admin/ui";
import { DatasetList, UploadForm } from "@/components/cdp/admin-upload";

export const dynamic = "force-dynamic";

export default async function CdpDataPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requirePageUser();
  if (me.role !== "ADMIN") redirect({ href: "/admin", locale: await getLocale() });
  const t = await getTranslations("Cdp");
  const datasets = await listDatasets();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-navy">{t("adminTitle")}</h1>
      <p className="max-w-3xl text-sm text-muted">{t("adminIntro")}</p>
      <Card title={t("uploadTitle")}><UploadForm /></Card>
      <DatasetList datasets={datasets.map((d) => ({ ...d, activatedAt: d.activatedAt?.toISOString() ?? null, createdAt: d.createdAt.toISOString() }))} />
    </div>
  );
}
