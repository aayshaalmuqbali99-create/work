import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { primaryNav } from "./nav-links";

export function SiteFooter() {
  const t = useTranslations();
  return (
    <footer className="mt-24 bg-navy text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-sm text-sm">{t("Brand.tagline")}</p>
          <p className="text-sm text-teal-light/80">{t("Footer.market")}</p>
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
          © {new Date().getFullYear()} LabSouq. {t("Footer.rights")}
        </p>
      </div>
    </footer>
  );
}
