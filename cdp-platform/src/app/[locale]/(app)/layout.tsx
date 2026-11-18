import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { requirePageUser } from "@/lib/auth/page";
import { omantelLogo } from "@/lib/brand-logo";
import { logoutAction } from "@/features/auth/actions";
import { isThanksBoardPublic, getUserCdpRaw } from "@/features/cdp/data";
import { Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { OmantelLogo } from "@/components/layout/omantel-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MainNav } from "@/components/layout/main-nav";

/** Signed-in shell: Omantel header, navigation, sign-out. Every page below also checks access itself. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const t = await getTranslations("Cdp");
  const logo = omantelLogo(await getLocale());
  const showBoard = (await getUserCdpRaw(user)) || (await isThanksBoardPublic());
  const items = [
    { href: "/", label: t("navResults") },
    ...(showBoard ? [{ href: "/thanks", label: t("boardTitle") }] : []),
    ...(user.role === "ADMIN" ? [{ href: "/data", label: t("navData") }, { href: "/users", label: t("navUsers") }] : []),
    { href: "/account", label: t("navAccount") },
  ];
  return (
    <>
      <header className="cdp-chrome border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/" className="shrink-0" aria-label={t("navResults")}>
            {logo ? <OmantelLogo src={logo.src} className="h-10 sm:h-12" /> : <span className="text-xl font-bold text-navy">Omantel</span>}
          </Link>
          <span className="hidden h-10 w-px bg-line sm:block" aria-hidden="true" />
          <div className="order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-navy rtl:text-end sm:rtl:text-start" lang="en" dir="ltr">Omantel | CDP Programme Evaluation 2026</p>
            <p className="truncate text-sm text-ink sm:text-base">{t("platformName")}</p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher />
            <form action={logoutAction} className="cdp-hide-present">
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted hover:bg-canvas hover:text-navy" title={user.name}>
                <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                <span className="hidden sm:inline">{t("logout")}</span>
              </button>
            </form>
          </div>
        </div>
        <div className="cdp-hide-present mx-auto max-w-7xl px-4 pb-2 sm:px-6">
          <MainNav items={items} />
        </div>
      </header>
      {children}
    </>
  );
}
