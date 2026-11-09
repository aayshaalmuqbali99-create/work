import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDevices } from "@/features/catalog/data";
import { RequestForm } from "@/components/requests/request-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Request" });
  return { title: t("title"), description: t("intro"), alternates: { canonical: `/${locale}/request`, languages: { ar: "/ar/request", en: "/en/request" } } };
}

export const dynamic = "force-dynamic";

export default async function RequestPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ device?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Request");
  const { device } = await searchParams;
  const options = (await getDevices(locale)).map((d) => ({ slug: d.slug, name: d.name, quantity: d.quantity }));
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="ls-enter mb-8">
        <h1 className="border-s-4 border-amber-500 ps-4 text-h2 font-bold tracking-tight text-navy">{t("title")}</h1>
        <p className="mt-3 text-muted">{t("intro")}</p>
      </header>
      <RequestForm options={options} initialSlug={device} />
    </div>
  );
}
