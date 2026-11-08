import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/features/admin/queries";
import { formOptions } from "@/features/admin/form-options";
import { DeviceForm } from "@/components/admin/device-form";

export default async function NewDevicePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageUser();
  const t = await getTranslations("Admin");
  const opts = await formOptions(locale);
  return (
    <div className="space-y-5">
      <Link href="/admin/devices" className="inline-flex items-center gap-1.5 text-sm font-medium text-teal"><ArrowLeft className="size-4 rtl:-scale-x-100" />{t("devicesTitle")}</Link>
      <h1 className="text-2xl font-bold text-navy">{t("newTitle")}</h1>
      <DeviceForm
        values={{ id: null, nameEn: "", nameAr: "", brand: "", model: "", slug: "", categoryKey: "", archetype: "", condition: "UNVERIFIED", quantity: 0, marketPrice: "", descEn: "", descAr: "", usesEn: [], usesAr: [], benefitsEn: [], benefitsAr: [] }}
        {...opts}
      />
    </div>
  );
}
