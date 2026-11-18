import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { FileSpreadsheet, Settings } from "lucide-react";
import { redirect, Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDashboard } from "@/features/cdp/data";
import { TABS, type TabId } from "@/features/cdp/config";
import { CdpDashboard } from "@/components/cdp/dashboard";
import { DataFooter } from "@/components/cdp/data-footer";

export const dynamic = "force-dynamic";

export default async function CdpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ dept?: string; tab?: string; present?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/admin/login?next=/cdp", locale: await getLocale() });
  const t = await getTranslations("Cdp");
  const view = await getDashboard(user!);
  const sp = await searchParams;
  const isAdmin = user!.role === "ADMIN";

  const adminBar = isAdmin ? (
    <Link href="/admin/cdp" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-navy hover:border-teal">
      <FileSpreadsheet className="size-4" aria-hidden="true" />
      {t("manageData")}
    </Link>
  ) : user!.role !== "VIEWER" ? (
    <Link href="/admin" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-navy hover:border-teal">
      <Settings className="size-4" aria-hidden="true" />
      {t("controlPanel")}
    </Link>
  ) : null;

  return (
    <>
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-1 text-2xl font-bold text-navy sm:text-3xl">{t("pageTitle")}</h1>
        <p className="mb-5 text-sm text-muted">{t("pageIntro")}</p>
        {view ? (
          <CdpDashboard
            view={view}
            isAdmin={isAdmin}
            adminBar={adminBar}
            initial={{
              dept: sp.dept !== undefined && /^\d+$/.test(sp.dept) ? Number(sp.dept) : null,
              tab: (TABS.find((x) => x.id === sp.tab)?.id ?? "general") as TabId,
              present: sp.present === "1",
            }}
          />
        ) : (
          <div className="rounded-card border border-dashed border-line bg-surface p-10 text-center">
            <FileSpreadsheet className="mx-auto size-10 text-teal" aria-hidden="true" />
            <p className="mt-3 font-semibold text-navy">{t("noData")}</p>
            <p className="mt-1 text-sm text-muted">{isAdmin ? t("noDataAdmin") : t("noDataViewer")}</p>
            {isAdmin && <div className="mt-4 flex justify-center">{adminBar}</div>}
          </div>
        )}
      </main>
      {view && <DataFooter fileName={view.meta.fileName} updated={view.meta.activatedAt} />}
    </>
  );
}
