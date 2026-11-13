import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireFacPage } from "@/features/facility/server/guard";
import { getWizardConfig } from "@/features/facility/server/queries";
import { LocationPreview } from "@/components/facility/ops/location-preview";

export default async function LocationPreviewPage() {
  await requireFacPage("config.manage");
  const [t, locale, config] = await Promise.all([getTranslations("Fac"), getLocale(), getWizardConfig()]);
  const Back = locale === "ar" ? ArrowRight : ArrowLeft;
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/facility/ops/locations" className="inline-flex items-center gap-2 text-sm font-semibold text-deep hover:underline"><Back className="size-4" /> {t("Ops.config.locationsTitle")}</Link>
      <h1 className="mb-6 mt-3 text-3xl font-extrabold tracking-tight text-fink">{t("Ops.config.previewTitle")}</h1>
      <LocationPreview config={config} />
    </div>
  );
}
