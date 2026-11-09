"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { Bell, ChevronDown, Home, Info, LayoutGrid, LayoutDashboard, LogOut, Menu, PackageOpen, ShoppingCart, User, X, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { logoutAction } from "@/features/admin/auth-actions";
import { Logo, type BrandProps } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { primaryNav } from "./nav-links";
import { cn } from "@/lib/utils";

const ICONS: Record<(typeof primaryNav)[number]["key"], LucideIcon> = {
  home: Home,
  equipment: PackageOpen,
  categories: LayoutGrid,
  request: ShoppingCart,
  about: Info,
};

export type HeaderUser = { name: string; newRequests: number } | null;

export function SiteHeader({ brand, user = null }: { brand?: BrandProps; user?: HeaderUser }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href));

  return (
    <header className={cn("sticky top-0 z-40 border-b bg-surface/95 backdrop-blur-md transition-shadow duration-300", scrolled ? "border-line shadow-sm" : "border-transparent")}>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Logo brand={brand} />
        <nav className="hidden flex-1 justify-center lg:flex" aria-label={t("menu")}>
          <ul className="flex items-center gap-1">
            {primaryNav.map((item) => {
              const Icon = ICONS[item.key];
              const active = isActive(item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
                      active ? "bg-[#e8f0fe] text-[#1b6fd1]" : "text-ink hover:bg-canvas hover:text-navy",
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          {user && (
            <>
              <Link href="/admin/requests" className="relative inline-flex size-10 items-center justify-center rounded-full text-navy hover:bg-canvas" aria-label={`${t("notifications")}: ${user.newRequests}`}>
                <Bell className="size-5" />
                {user.newRequests > 0 && (
                  <span className="absolute end-1 top-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white" dir="ltr">{user.newRequests}</span>
                )}
              </Link>
              <div ref={menuRef} className="relative hidden sm:block">
                <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} className="inline-flex items-center gap-2 rounded-full py-1 pe-2 ps-1 text-sm font-medium text-navy hover:bg-canvas">
                  <span className="grid size-8 place-items-center rounded-full bg-navy text-white"><User className="size-4" /></span>
                  <span className="max-w-40 truncate">{t("greeting", { name: user.name })}</span>
                  <ChevronDown className="size-4" />
                </button>
                {menu && (
                  <div className="absolute end-0 top-12 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
                    <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-canvas"><LayoutDashboard className="size-4" />{t("controlPanel")}</Link>
                    <form action={logoutAction}>
                      <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"><LogOut className="size-4 rtl:-scale-x-100" />{t("logout")}</button>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-navy hover:bg-teal-light lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t("close") : t("menu")}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label={t("menu")}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line bg-surface lg:hidden"
          >
            <ul className="space-y-1 px-4 py-3">
              {primaryNav.map((item) => {
                const Icon = ICONS[item.key];
                return (
                  <li key={item.key}>
                    <Link href={item.href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium", isActive(item.href) ? "bg-[#e8f0fe] text-[#1b6fd1]" : "text-ink hover:bg-canvas")}>
                      <Icon className="size-5" aria-hidden="true" />
                      {t(item.key)}
                    </Link>
                  </li>
                );
              })}
              {user && (
                <li>
                  <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-ink hover:bg-canvas"><LayoutDashboard className="size-5" />{t("controlPanel")}</Link>
                </li>
              )}
              <li className="px-3 pt-2 sm:hidden"><LanguageSwitcher /></li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
