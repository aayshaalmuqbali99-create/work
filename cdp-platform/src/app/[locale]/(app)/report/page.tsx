import { getLocale, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requirePageUser } from "@/lib/auth/page";
import { getDashboard } from "@/features/cdp/data";
import { CdpReport } from "@/components/cdp/report";

export const dynamic = "force-dynamic";

/**
 * Printable management export (save as PDF from the print dialog).
 * Always built at management level: aggregated results, comments with identifying details removed,
 * no supporter names, no per-department results for small departments. Respondent names and
 * employee numbers are never stored, so they cannot appear here.
 */
export default async function CdpReportPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ dept?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageUser();
  const view = await getDashboard(user, { management: true });
  if (!view) redirect({ href: "/", locale: await getLocale() });
  const { dept } = await searchParams;
  const d = dept !== undefined && /^\d+$/.test(dept) && view!.departments[Number(dept)]?.selectable ? Number(dept) : null;
  return <CdpReport view={view!} dept={d} generated={new Date().toISOString()} />;
}
