import { getLocale, getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { OmantelLogo } from "@/components/facility/brand-logo";
import { FacLanguageSwitch } from "@/components/facility/hub-header";
import { OpsSidebar } from "@/components/facility/ops/ops-sidebar";
import { requireFacPage } from "@/features/facility/server/guard";
import { can } from "@/features/facility/domain/permissions";
import { facLogoutAction } from "@/features/facility/actions/auth";
import { db } from "@/lib/db";

export async function generateMetadata() {
  const t = await getTranslations("Fac.Ops");
  return { title: t("title") };
}

/** Facility Operations command center (separate from the employee experience). Server-side role check. */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireFacPage("ops.view", "/facility/ops");
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Fac")]);
  const hasSample = can(user.role, "config.manage") && (await db.facRequest.count({ where: { isSample: true } })) > 0;
  return (
    <div className="flex min-h-dvh bg-[#F7F7FB]">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-fline bg-white/90 px-4 backdrop-blur sm:px-6">
        <Link href="/facility/ops" className="flex items-center gap-3 p-1">
          <OmantelLogo locale={locale} height={locale === "ar" ? 32 : 17} priority />
          <span className="h-6 w-px bg-fline" aria-hidden="true" />
          <span className="text-sm font-bold text-deep">{t("Brand.name")}</span>
          <span className="hidden rounded-full bg-lav-50 px-2.5 py-1 text-xs font-bold text-deep sm:inline">{t("Ops.commandCenter")}</span>
        </Link>
        <div className="ms-auto flex items-center gap-2">
          <FacLanguageSwitch />
          <div className="hidden text-end sm:block">
            <p className="text-sm font-bold leading-tight text-fink">{user.name}</p>
            <p className="text-xs text-fmuted">{t(`Ops.role.${user.role}`)}</p>
          </div>
          <form action={facLogoutAction}>
            <button className="grid size-10 place-items-center rounded-full text-fmuted hover:bg-lav-50 hover:text-fink" aria-label={t("Nav.signOut")}><LogOut className="size-4" /></button>
          </form>
        </div>
      </header>
      <OpsSidebar perms={{ view: true, analytics: can(user.role, "ops.analytics"), config: can(user.role, "config.manage") }} />
      <main id="main" className="min-w-0 flex-1 px-4 pb-16 pt-24 sm:px-8">
        {hasSample && (
          <p className="mb-6 rounded-2xl border border-[#FFE59A] bg-[#FFF8E0] px-4 py-3 text-sm text-[#5C4400]">{t("Ops.sampleBanner")}</p>
        )}
        {children}
      </main>
    </div>
  );
}
