import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo, type BrandProps } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { primaryNav } from "./nav-links";

export type FooterContent = { tagline?: string; text?: string; email?: string; phone?: string; address?: string };

export function SiteFooter({ brand, content = {} }: { brand?: BrandProps; content?: FooterContent }) {
  const t = useTranslations();
  return (
    <footer id="site-footer" className="mt-16 bg-navy text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="space-y-4">
          <Logo inverted brand={brand} />
          <p className="max-w-sm text-sm">{content.tagline || t("Brand.tagline")}</p>
          {content.text && <p className="max-w-sm text-sm text-white/70">{content.text}</p>}
          <p className="text-sm text-teal-light/80">{t("Footer.market")}</p>
          {(content.email || content.phone || content.address) && (
            <ul className="space-y-1.5 text-sm">
              {content.email && <li className="flex items-center gap-2"><Mail className="size-4 text-[#3FB8BE]" aria-hidden="true" /><a href={`mailto:${content.email}`} dir="ltr" className="hover:text-white">{content.email}</a></li>}
              {content.phone && <li className="flex items-center gap-2"><Phone className="size-4 text-[#3FB8BE]" aria-hidden="true" /><a href={`tel:${content.phone.replace(/[^+\d]/g, "")}`} dir="ltr" className="hover:text-white">{content.phone}</a></li>}
              {content.address && <li className="flex items-center gap-2"><MapPin className="size-4 text-[#3FB8BE]" aria-hidden="true" />{content.address}</li>}
            </ul>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-white">{t("Footer.explore")}</h2>
          <ul className="space-y-2 text-sm">
            {primaryNav.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="hover:text-white">{t(`Nav.${item.key}`)}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-white">{t("Language.label")}</h2>
          <LanguageSwitcher />
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/60 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} {brand?.name || t("Brand.name")}. {t("Footer.rights")}
        </p>
      </div>
    </footer>
  );
}
