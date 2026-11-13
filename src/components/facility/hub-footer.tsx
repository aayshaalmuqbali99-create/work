import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { OmantelLogo } from "./brand-logo";

export async function HubFooter() {
  const locale = await getLocale();
  const t = await getTranslations("Fac");
  const links = [
    ["/facility", t("Nav.home")],
    ["/facility/request", t("Nav.submit")],
    ["/facility/requests", t("Nav.myRequests")],
  ] as const;
  const help = [
    ["/facility/guide", t("Nav.guide")],
    ["/facility/map", t("Nav.map")],
    ["/facility/ops", t("Nav.operations")],
  ] as const;
  return (
    <footer className="relative mt-24 overflow-hidden bg-deep text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-4">
            <div className="p-2">
              <OmantelLogo locale={locale} reverse height={locale === "ar" ? 44 : 22} />
            </div>
            <span className="h-8 w-px bg-white/30" aria-hidden="true" />
            <span className="text-lg font-bold">{t("Brand.name")}</span>
          </div>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/80">{t("Footer.about")}</p>
        </div>
        <nav aria-label={t("Footer.platform")}>
          <h2 className="text-sm font-bold text-gold">{t("Footer.platform")}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {links.map(([href, label]) => (
              <li key={href}><Link href={href} className="text-white/85 hover:text-white hover:underline">{label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t("Footer.help")}>
          <h2 className="text-sm font-bold text-gold">{t("Footer.help")}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {help.map(([href, label]) => (
              <li key={href}><Link href={href} className="text-white/85 hover:text-white hover:underline">{label}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>{t("Footer.rights", { year: new Date().getFullYear() })}</p>
          <p>{t("Footer.itNote")}</p>
        </div>
      </div>
    </footer>
  );
}
