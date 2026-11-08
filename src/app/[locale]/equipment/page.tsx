import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EquipmentBrowser } from "@/components/equipment/equipment-browser";
import { categoryKeys, getDevices, getStats } from "@/features/catalog/data";
import type { CategoryKey } from "@/features/catalog/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Equipment" });
  return { title: t("title"), description: t("subtitle"), alternates: { languages: { ar: "/ar/equipment", en: "/en/equipment" } } };
}

export default async function EquipmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Equipment");
  const stats = getStats();
  const categories = categoryKeys.map((key) => ({ key, count: stats.byCategory[key] })).filter((c) => c.count > 0);
  const initialCategory = categoryKeys.includes(sp.category as CategoryKey) ? (sp.category as CategoryKey) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8 ls-enter">
        <h1 className="text-h2 font-bold tracking-tight text-navy">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("subtitle")}</p>
      </header>
      <EquipmentBrowser devices={getDevices(locale)} categories={categories} initialCategory={initialCategory} initialQuery={sp.q ?? ""} />
    </div>
  );
}
