import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return { title: t("title"), alternates: { languages: { ar: "/ar/about", en: "/en/about" } } };
}

function AboutContent() {
  const t = useTranslations("About");
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="ls-enter">
        <h1 className="text-display font-bold tracking-tight text-navy">{t("title")}</h1>
        <p className="mt-6 text-xl text-ink">{t("lead")}</p>
        <p className="mt-6 text-muted">{t("body1")}</p>
        <p className="mt-6 border-s-4 border-teal ps-4 font-medium text-navy">{t("body2")}</p>
      </div>
    </article>
  );
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AboutContent />;
}
