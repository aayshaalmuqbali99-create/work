import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/auth/page";
import { listDatasets } from "@/features/cdp/data";
import { Card } from "@/components/ui";
import { DatasetList, UploadForm } from "@/components/cdp/admin-upload";

export const dynamic = "force-dynamic";

export default async function CdpDataPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageUser("ADMIN");
  const t = await getTranslations("Cdp");
  const datasets = await listDatasets();
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold text-navy">{t("adminTitle")}</h1>
      <p className="max-w-3xl text-sm text-muted">{t("adminIntro")}</p>
      <Card title={t("uploadTitle")}><UploadForm /></Card>
      <DatasetList datasets={datasets.map((d) => ({ ...d, activatedAt: d.activatedAt?.toISOString() ?? null, createdAt: d.createdAt.toISOString() }))} />
    </main>
  );
}
