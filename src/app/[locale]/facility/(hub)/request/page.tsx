import { getTranslations, setRequestLocale } from "next-intl/server";
import { SimpleRequestForm, type WizardPreset } from "@/components/facility/wizard/simple-request-form";
import { requireFacPage } from "@/features/facility/server/guard";
import { getWizardConfig } from "@/features/facility/server/queries";
import { getSettings } from "@/features/facility/server/calendar";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "Fac.Simple" });
  return { title: t("title") };
}

export default async function NewRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ service?: string; area?: string; location?: string; from?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const user = await requireFacPage("request.create", "/facility/request");
  const [config, settings, t] = await Promise.all([getWizardConfig(), getSettings(), getTranslations("Fac")]);
  const preset: WizardPreset = {
    service: sp.service === "MAINTENANCE" || sp.service === "CLEANING" ? sp.service : undefined,
    areaId: typeof sp.area === "string" && sp.area.length < 40 ? sp.area : undefined,
    locationId: typeof sp.location === "string" && sp.location.length < 40 ? sp.location : undefined,
    source: sp.from === "qr" ? "qr" : sp.from === "map" ? "map" : undefined,
  };
  return (
    <div className="bg-[linear-gradient(180deg,#F6F5FF_0,#ffffff_420px)] px-5 pb-10 pt-32 sm:px-8">
      <div className="mx-auto mb-6 max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-fink sm:text-5xl">{t("Simple.title")}</h1>
        <p className="mt-2 text-lg text-fmuted">{t("Simple.subtitle")}</p>
      </div>
      <SimpleRequestForm config={config} userId={user.id} preset={preset} emergencyContact={locale === "ar" ? settings.emergencyContactAr : settings.emergencyContactEn} />
    </div>
  );
}
