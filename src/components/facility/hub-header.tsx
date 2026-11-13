"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { Bell, ChevronDown, LayoutDashboard, LogOut, Menu, Plus, X, Globe, UserRound } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { facLogoutAction, setFacLocaleAction } from "@/features/facility/actions/auth";
import { OmantelLogo } from "./brand-logo";
import { fhBtn } from "./ui";

export type HeaderUser = { name: string; email: string; role: string; canOps: boolean } | null;
export type HeaderNotification = { id: string; reference: string; text: string; when: string };

const NAV = [
  { href: "/facility", key: "home" },
  { href: "/facility/request", key: "submit" },
  { href: "/facility/requests", key: "myRequests" },
  { href: "/facility/guide", key: "guide" },
  { href: "/facility/map", key: "map" },
] as const;

/** Language switch that keeps the page, query string and (via the draft store) form state. */
export function FacLanguageSwitch({ dark }: { dark?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("Fac.Nav");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const next = locale === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      onClick={() => {
        const suffix = window.location.search + window.location.hash;
        setFacLocaleAction(next).catch(() => {});
        start(() => router.replace(`${pathname}${suffix}`, { locale: next, scroll: false }));
      }}
      aria-label={`${t("language")}: ${next === "ar" ? "العربية" : "English"}`}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition",
        dark ? "text-white hover:bg-white/15" : "text-deep hover:bg-lav-50",
        pending && "opacity-60",
      )}
    >
      <Globe className="size-4" aria-hidden="true" />
      <span lang={next} className={next === "ar" ? "font-arabic" : ""}>{next === "ar" ? "العربية" : "English"}</span>
    </button>
  );
}

export function HubHeader({ user, notifications }: { user: HeaderUser; notifications: HeaderNotification[] }) {
  const t = useTranslations("Fac.Nav");
  const tb = useTranslations("Fac.Brand");
  const locale = useLocale();
  const pathname = usePathname();
  const overHero = pathname === "/facility";
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<null | "bell" | "me">(null);
  const last = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      // hide on fast scroll down, show on scroll up
      setHidden(y > 320 && y > last.current + 4 && !open);
      if (y < last.current - 4) setHidden(false);
      last.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!panel) return;
    const close = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !(e.target as HTMLElement).closest("[data-fh-panel]")) setPanel(null);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("mousedown", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("mousedown", close);
    };
  }, [panel]);

  const dark = overHero && !scrolled && !open;
  const active = (href: string) => (href === "/facility" ? pathname === href : pathname.startsWith(href));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 px-3 pt-3 transition-transform duration-300 sm:px-5",
        hidden && "-translate-y-[120%]",
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-16 max-w-7xl items-center gap-3 rounded-[22px] px-3 transition-all duration-300 sm:px-5",
          dark ? "bg-transparent" : "fh-glass border border-white/60 shadow-soft",
        )}
      >
        <Link href="/facility" className="flex shrink-0 items-center gap-3 rounded-xl p-1.5" aria-label={tb("full")}>
          <OmantelLogo locale={locale} reverse={dark} height={locale === "ar" ? 34 : 18} priority />
          <span className={cn("h-7 w-px", dark ? "bg-white/40" : "bg-fline")} aria-hidden="true" />
          <span className={cn("whitespace-nowrap text-[15px] font-bold tracking-tight", dark ? "text-white" : "text-deep")}>{tb("name")}</span>
        </Link>

        <nav className="ms-4 hidden flex-1 items-center gap-1 lg:flex" aria-label={t("menu")}>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={cn(
                "relative rounded-full px-3.5 py-2 text-sm font-semibold transition",
                dark ? "text-white/85 hover:text-white hover:bg-white/10" : "text-fmuted hover:text-deep hover:bg-lav-50",
                active(n.href) && (dark ? "text-white" : "text-deep"),
              )}
            >
              {t(n.key)}
              {active(n.href) && <motion.span layoutId="fh-nav-dot" className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-gold" />}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1">
          <span className="hidden sm:block"><FacLanguageSwitch dark={dark} /></span>
          {user && (
            <div className="relative" data-fh-panel>
              <button
                type="button"
                onClick={() => setPanel(panel === "bell" ? null : "bell")}
                aria-expanded={panel === "bell"}
                aria-label={t("notifications")}
                className={cn("relative grid size-10 place-items-center rounded-full transition", dark ? "text-white hover:bg-white/15" : "text-deep hover:bg-lav-50")}
              >
                <Bell className="size-5" aria-hidden="true" />
                {notifications.length > 0 && <span className="absolute end-2 top-2 size-2 rounded-full bg-gold ring-2 ring-white" />}
              </button>
              <AnimatePresence>
                {panel === "bell" && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute end-0 mt-2 w-80 overflow-hidden rounded-3xl border border-fline bg-white p-2 shadow-lift"
                  >
                    <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-fmuted">{t("notifications")}</p>
                    {notifications.length === 0 ? (
                      <p className="px-3 pb-4 pt-1 text-sm text-fmuted">{t("noNotifications")}</p>
                    ) : (
                      <ul>
                        {notifications.map((n) => (
                          <li key={n.id}>
                            <Link href={`/facility/requests/${n.reference}`} onClick={() => setPanel(null)} className="block rounded-2xl px-3 py-2.5 hover:bg-lav-50">
                              <span className="block text-sm font-semibold text-fink">{n.text}</span>
                              <span className="mt-0.5 block text-xs text-fmuted" dir="ltr">{n.reference} · {n.when}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {user ? (
            <div className="relative" data-fh-panel>
              <button
                type="button"
                onClick={() => setPanel(panel === "me" ? null : "me")}
                aria-expanded={panel === "me"}
                aria-label={t("profile")}
                className={cn("flex items-center gap-2 rounded-full p-1 pe-2 transition", dark ? "text-white hover:bg-white/15" : "text-fink hover:bg-lav-50")}
              >
                <span className="grid size-8 place-items-center rounded-full bg-gold text-sm font-bold text-fink">{user.name.trim().charAt(0).toUpperCase()}</span>
                <ChevronDown className="hidden size-4 sm:block" aria-hidden="true" />
              </button>
              <AnimatePresence>
                {panel === "me" && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute end-0 mt-2 w-72 rounded-3xl border border-fline bg-white p-2 shadow-lift"
                  >
                    <div className="px-3 py-3">
                      <p className="font-bold text-fink">{user.name}</p>
                      <p className="truncate text-sm text-fmuted" dir="ltr">{user.email}</p>
                      <p className="mt-1 text-xs font-semibold text-deep">{user.role}</p>
                    </div>
                    {user.canOps && (
                      <Link href="/facility/ops" className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold text-deep hover:bg-lav-50">
                        <LayoutDashboard className="size-4" aria-hidden="true" /> {t("operations")}
                      </Link>
                    )}
                    <form action={facLogoutAction}>
                      <button className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold text-fmuted hover:bg-lav-50 hover:text-fink">
                        <LogOut className="size-4" aria-hidden="true" /> {t("signOut")}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/facility/login" className={cn(dark ? fhBtn.onDark : fhBtn.secondary, "hidden min-h-10 py-2 sm:inline-flex")}>
              <UserRound className="size-4" aria-hidden="true" /> {t("signIn")}
            </Link>
          )}
          <Link href="/facility/request" className={cn(fhBtn.accent, "hidden min-h-10 py-2 md:inline-flex")}>
            <Plus className="size-4" aria-hidden="true" /> {t("submit")}
          </Link>
          <button
            type="button"
            className={cn("grid size-10 place-items-center rounded-full lg:hidden", dark ? "text-white hover:bg-white/15" : "text-deep hover:bg-lav-50")}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="fh-mobile-nav"
            aria-label={open ? t("close") : t("menu")}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="fh-mobile-nav"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mt-2 max-w-7xl rounded-[22px] border border-fline bg-white p-3 shadow-lift lg:hidden"
            aria-label={t("menu")}
          >
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active(n.href) ? "page" : undefined}
                className={cn("flex min-h-12 items-center rounded-2xl px-4 text-base font-semibold", active(n.href) ? "bg-lav-50 text-deep" : "text-fink hover:bg-lav-50")}
              >
                {t(n.key)}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-fline px-2 pt-3">
              <FacLanguageSwitch />
              {!user && (
                <Link href="/facility/login" className={fhBtn.secondary}>
                  {t("signIn")}
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
