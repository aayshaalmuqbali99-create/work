import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ExternalLink, LogOut } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requirePageUser } from "@/features/admin/queries";
import { logoutAction } from "@/features/admin/auth-actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const t = await getTranslations("Admin");
  const reviewCount = await db.device.count({ where: { status: "REVIEW", deletedAt: null } });
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[250px_1fr]">
      <aside className="bg-navy px-4 py-4 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:py-6">
        <div className="mb-4 flex items-center justify-between gap-3 lg:mb-8 lg:block">
          <Link href="/admin" className="text-lg font-bold">
            Lab<span className="text-[#3FB8BE]">Souq</span> <span className="text-sm font-medium text-white/60">· {t("title")}</span>
          </Link>
        </div>
        <Suspense><AdminNav reviewCount={reviewCount} /></Suspense>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4 text-sm lg:mt-auto lg:flex-col lg:items-stretch">
          <p className="truncate text-white/70">{user.name}</p>
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-white/70 hover:bg-white/5 hover:text-white">
            <ExternalLink className="size-4" aria-hidden="true" />{t("viewSite")}
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-white/70 hover:bg-white/5 hover:text-white">
              <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />{t("logout")}
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex justify-end border-b border-line bg-surface px-4 py-2.5 sm:px-6">
          <LanguageSwitcher />
        </div>
        <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
