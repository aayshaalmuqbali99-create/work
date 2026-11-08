import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, CheckCircle2, FlaskConical, GraduationCap, Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { formatOMR, getAllSlugs, getDevice, getDevices, pricingNotes } from "@/features/catalog/data";
import { ViewerLoader } from "@/components/viewer3d/viewer-loader";
import { DeviceCard } from "@/components/equipment/device-card";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getAllSlugs().map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const d = getDevice(slug, locale);
  if (!d) return {};
  return {
    title: d.name,
    description: d.desc,
    alternates: { languages: { ar: `/ar/equipment/${slug}`, en: `/en/equipment/${slug}` } },
    openGraph: { title: d.name, description: d.desc, images: [d.photo.src] },
  };
}

export default async function DevicePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const d = getDevice(slug, locale);
  if (!d) notFound();
  const t = await getTranslations("Equipment");
  const tc = await getTranslations("Categories");
  const related = getDevices(locale).filter((x) => x.category === d.category && x.slug !== d.slug).slice(0, 4);
  const conditionLabel = { unverified: t("conditionUnverified"), new: t("conditionNew"), used: t("conditionUsed") }[d.condition];

  const facts: { label: string; value: React.ReactNode; ltr?: boolean }[] = [
    { label: t("brand"), value: d.brand ?? t("notProvided"), ltr: !!d.brand },
    { label: t("model"), value: d.model ?? t("notProvided"), ltr: !!d.model },
    { label: t("category"), value: tc(d.category) },
    { label: t("itemNo"), value: d.itemNos.join(" + "), ltr: true },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/equipment" className="inline-flex items-center gap-1.5 text-sm font-medium text-teal hover:text-navy">
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("back")}
      </Link>

      <header className="ls-enter mt-4 max-w-4xl">
        <p className="text-sm font-semibold text-teal">{tc(d.category)}</p>
        <h1 className="mt-1 text-h2 font-bold tracking-tight text-navy">{d.name}</h1>
        <p className="mt-1 text-muted" lang={locale === "ar" ? "en" : "ar"} dir={locale === "ar" ? "ltr" : "rtl"}>{d.altName}</p>
      </header>

      {/* Key facts */}
      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-line bg-surface p-4">
          <dt className="text-xs font-medium text-muted">{t("quantity")}</dt>
          <dd className="mt-1 text-2xl font-bold text-navy">{t("units", { count: d.quantity })}</dd>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <dt className="text-xs font-medium text-muted">{t("condition")}</dt>
          <dd className="mt-1 inline-flex items-center gap-2 text-lg font-semibold text-navy">
            <span className={`size-2.5 rounded-full ${d.condition === "unverified" ? "bg-amber-500" : "bg-teal"}`} />
            {conditionLabel}
          </dd>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <dt className="text-xs font-medium text-muted">{t("marketPrice")}</dt>
          <dd className="mt-1 text-2xl font-bold text-navy">
            {d.indicativeNewUnitPriceOMR != null ? (
              <>≈ {formatOMR(d.indicativeNewUnitPriceOMR)} <span className="text-base font-semibold">{t("currency")}</span> <span className="text-sm font-normal text-muted">/ {t("perUnit")}</span></>
            ) : t("notProvided")}
          </dd>
          <p className="mt-2 flex gap-1.5 text-xs text-muted"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{t("marketPriceNote")}</p>
        </div>
      </dl>

      {/* 3D first */}
      <section className="mt-10" aria-labelledby="explore-3d">
        <h2 id="explore-3d" className="text-xl font-bold text-navy">{t("explore3d")}</h2>
        <p className="mb-4 mt-1 text-sm text-muted">{t("explore3dSub")}</p>
        <ViewerLoader archetypeKey={d.archetype} deviceName={d.name} fallbackImage={d.photo} />
      </section>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold text-navy">{t("about")}</h2>
            <p className="mt-3 text-ink">{d.desc}</p>
          </section>
          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-navy"><FlaskConical className="size-5 text-teal" aria-hidden="true" />{t("uses")}</h2>
            <ul className="mt-3 space-y-2">
              {d.uses.map((u) => (
                <li key={u} className="flex gap-2 text-ink"><CheckCircle2 className="mt-1 size-4 shrink-0 text-teal" aria-hidden="true" />{u}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-card bg-navy p-6 text-white">
            <h2 className="flex items-center gap-2 text-xl font-bold"><GraduationCap className="size-5 text-[#3FB8BE]" aria-hidden="true" />{t("benefits")}</h2>
            <ul className="mt-3 space-y-2">
              {d.benefits.map((b) => (
                <li key={b} className="flex gap-2 text-white/85"><CheckCircle2 className="mt-1 size-4 shrink-0 text-[#3FB8BE]" aria-hidden="true" />{b}</li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="space-y-4">
          <figure className="rounded-card border border-line bg-surface p-4">
            <figcaption className="mb-3 text-sm font-semibold text-navy">{t("photo")}</figcaption>
            <Image src={d.photo.src} alt={d.name} width={d.photo.width} height={d.photo.height} className="mx-auto max-h-56 w-auto rounded-md object-contain" />
            <p className="mt-3 text-xs text-muted">{t("photoNote")}</p>
          </figure>
          <dl className="divide-y divide-line rounded-card border border-line bg-surface">
            {facts.map((f) => (
              <div key={f.label} className="flex justify-between gap-4 p-3 text-sm">
                <dt className="text-muted">{f.label}</dt>
                <dd className="text-end font-medium text-navy" dir={f.ltr ? "ltr" : undefined}>{f.value}</dd>
              </div>
            ))}
          </dl>
          <details className="rounded-card border border-line bg-surface p-4 text-sm">
            <summary className="cursor-pointer font-semibold text-navy">{t("pricingNotesTitle")}</summary>
            <div className="mt-2 space-y-2 text-xs text-muted" dir="ltr" lang="en">
              {pricingNotes.map((n) => <p key={n}>{n}</p>)}
            </div>
          </details>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-bold text-navy">{t("related")}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => <li key={r.slug}><DeviceCard device={r} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
