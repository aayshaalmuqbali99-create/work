"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3, Building2, ClipboardList, FileClock, Gauge, Home, Layers, Mail, Map, Menu, QrCode, Route, Timer, Users, X, HardHat,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    key: "groupWork",
    items: [
      { href: "/facility/ops", key: "dashboard", icon: Gauge, perm: "view" },
      { href: "/facility/ops/requests", key: "requests", icon: ClipboardList, perm: "view" },
      { href: "/facility/ops/analytics", key: "analytics", icon: BarChart3, perm: "analytics" },
    ],
  },
  {
    key: "groupConfig",
    items: [
      { href: "/facility/ops/locations", key: "locations", icon: Building2, perm: "config" },
      { href: "/facility/ops/categories", key: "categories", icon: Layers, perm: "config" },
      { href: "/facility/ops/teams", key: "teams", icon: HardHat, perm: "config" },
      { href: "/facility/ops/routing", key: "routing", icon: Route, perm: "config" },
      { href: "/facility/ops/sla", key: "sla", icon: Timer, perm: "config" },
      { href: "/facility/ops/maps", key: "maps", icon: Map, perm: "config" },
      { href: "/facility/ops/qr", key: "qr", icon: QrCode, perm: "config" },
      { href: "/facility/ops/emails", key: "emails", icon: Mail, perm: "config" },
    ],
  },
  {
    key: "groupAdmin",
    items: [
      { href: "/facility/ops/users", key: "users", icon: Users, perm: "config" },
      { href: "/facility/ops/audit", key: "audit", icon: FileClock, perm: "config" },
    ],
  },
] as const;

export function OpsSidebar({ perms }: { perms: { view: boolean; analytics: boolean; config: boolean } }) {
  const t = useTranslations("Fac.Ops.nav");
  const tb = useTranslations("Fac");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/facility/ops" ? pathname === href : pathname.startsWith(href));

  const nav = (
    <nav aria-label={tb("Ops.title")} className="flex flex-col gap-6">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => perms[i.perm]);
        if (!items.length) return null;
        return (
          <div key={g.key}>
            <p className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">{t(g.key)}</p>
            <ul className="mt-2 space-y-0.5">
              {items.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={() => setOpen(false)}
                    aria-current={active(i.href) ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                      active(i.href) ? "bg-white text-deep" : "text-white/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <i.icon className="size-[18px]" aria-hidden="true" />
                    {t(i.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <Link href="/facility" className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white">
        <Home className="size-[18px]" aria-hidden="true" /> {t("employeeView")}
      </Link>
    </nav>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 overflow-y-auto bg-deep px-3 pb-6 pt-24 lg:block">{nav}</aside>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 start-5 z-40 grid size-12 place-items-center rounded-full bg-deep text-white shadow-lift lg:hidden" aria-label={t("dashboard")}>
        <Menu className="size-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 bg-deep/30 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="h-full w-72 overflow-y-auto bg-deep p-4 rtl:ms-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex justify-end">
                <button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full text-white hover:bg-white/10" aria-label={tb("Nav.close")}><X className="size-5" /></button>
              </div>
              {nav}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

