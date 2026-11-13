import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { RequestWizard, type WizardPreset } from "@/components/facility/wizard/request-wizard";
import { requireFacPage } from "@/features/facility/server/guard";
import { getWizardConfig } from "@/features/facility/server/queries";
import { getSettings } from "@/features/facility/server/calendar";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "Fac.Wizard" });
  return { title: t("title") };
}

export default async function NewRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ service?: string; area?: string; from?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const user = await requireFacPage("request.create", "/facility/request");
  const [config, settings, t] = await Promise.all([getWizardConfig(), getSettings(), getTranslations("Fac")]);
  const preset: WizardPreset = {
    service: sp.service === "MAINTENANCE" || sp.service === "CLEANING" ? sp.service : undefined,
    areaId: typeof sp.area === "string" && sp.area.length < 40 ? sp.area : undefined,
    source: sp.from === "qr" ? "qr" : sp.from === "map" ? "map" : undefined,
  };
  const lang = await getLocale();
  return (
    <div className="bg-[linear-gradient(180deg,#F6F5FF_0,#ffffff_420px)] px-5 pb-10 pt-32 sm:px-8">
      <div className="mx-auto mb-8 max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-deep">{t("Brand.full")}</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-fink sm:text-5xl">{t("Wizard.title")}</h1>
      </div>
      <RequestWizard
        config={config}
        userId={user.id}
        defaults={{ phone: user.phone, department: user.department }}
        preset={preset}
        emergencyContact={lang === "ar" ? settings.emergencyContactAr : settings.emergencyContactEn}
      />
    </div>
  );
}
