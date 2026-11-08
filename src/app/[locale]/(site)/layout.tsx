import { getLocale, getTranslations } from "next-intl/server";
import { Eye } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getSiteContent, pick } from "@/features/site/data";

/** Public website chrome (header + footer), driven by the website editor content. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const { site, preview } = await getSiteContent();
  const b = site.brand as unknown as Record<string, unknown>;
  const f = site.footer as unknown as Record<string, unknown>;
  const brand = { name: pick(b, "name", locale, ""), logoUrl: site.brand.logoUrl };
  const t = await getTranslations("Admin");
  return (
    <>
      {preview && (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-sm font-semibold text-navy">
          <Eye className="size-4" aria-hidden="true" />
          {t("previewBanner")}
          <a href={`/api/preview?on=0&to=/${locale}`} className="rounded-full bg-navy px-3 py-1 text-xs text-white">{t("exitPreview")}</a>
        </div>
      )}
      <SiteHeader brand={brand} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter
        brand={brand}
        content={{
          tagline: pick(b, "tagline", locale, ""),
          text: pick(f, "text", locale, ""),
          email: site.footer.email,
          phone: site.footer.phone,
          address: pick(f, "address", locale, ""),
        }}
      />
    </>
  );
}
