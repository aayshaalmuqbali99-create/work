"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ClipboardCheck, Cpu, History, Inbox, LayoutDashboard, Palette, UserCog, Users } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", key: "navDashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/devices", key: "navDevices", icon: Cpu },
  { href: "/admin/devices?status=REVIEW", key: "navReview", icon: ClipboardCheck },
  { href: "/admin/requests", key: "navRequests", icon: Inbox },
  { href: "/admin/activity", key: "navActivity", icon: History },
  { href: "/admin/site", key: "navSite", icon: Palette, adminOnly: true },
  { href: "/admin/users", key: "navUsers", icon: Users, adminOnly: true },
  { href: "/admin/account", key: "navAccount", icon: UserCog },
] as const;

export function AdminNav({ reviewCount, isAdmin }: { reviewCount: number; isAdmin: boolean }) {
  const t = useTranslations("Admin");
  const pathname = usePathname();
  const isReview = useSearchParams().get("status") === "REVIEW";
  return (
    <nav aria-label={t("title")} className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.filter((i) => isAdmin || !("adminOnly" in i)).map(({ href, key, icon: Icon, ...rest }) => {
        const base = href.split("?")[0];
        const active =
          "exact" in rest
            ? pathname === base
            : key === "navReview"
              ? pathname === base && isReview
              : key === "navDevices"
                ? pathname.startsWith(base) && !isReview
                : pathname.startsWith(base);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {t(key)}
            {key === "navReview" && reviewCount > 0 && (
              <span className="ms-auto rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-navy">{reviewCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
