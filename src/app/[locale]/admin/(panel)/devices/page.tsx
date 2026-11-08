import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { DeviceStatus } from "@prisma/client";
import { ImageOff, Plus, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { listDevices, STATUSES } from "@/features/admin/queries";
import { formatOMR } from "@/features/catalog/format";
import { btnPrimary, inputCls, StatusBadge } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export default async function AdminDevicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as DeviceStatus) ? (sp.status as DeviceStatus) : undefined;
  const t = await getTranslations("Admin");
  const { devices, counts } = await listDevices({ status, q: sp.q });
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const tabHref = (s?: DeviceStatus) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (sp.q) p.set("q", sp.q);
    const qs = p.toString();
    return qs ? `/admin/devices?${qs}` : "/admin/devices";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy">{status === "REVIEW" ? t("navReview") : t("devicesTitle")}</h1>
        <Link href="/admin/devices/new" className={btnPrimary}><Plus className="size-4" />{t("newDevice")}</Link>
      </div>
      {status === "REVIEW" && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t("reviewIntro")}</p>}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <nav className="flex flex-wrap gap-1.5" aria-label={t("colStatus")}>
          {[undefined, ...STATUSES].map((s) => (
            <Link
              key={s ?? "all"}
              href={tabHref(s)}
              aria-current={status === s ? "page" : undefined}
              className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", status === s ? "border-navy bg-navy text-white" : "border-line bg-surface text-navy hover:border-teal")}
            >
              {s ? t(`status_${s}`) : t("statusAll")} <span className="ms-1 text-xs opacity-70">{s ? counts[s] ?? 0 : total}</span>
            </Link>
          ))}
        </nav>
        <form className="relative lg:ms-auto lg:w-72" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" type="search" defaultValue={sp.q} placeholder={t("search")} aria-label={t("search")} className={cn(inputCls, "ps-9")} />
        </form>
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line bg-canvas text-xs text-muted">
            <tr>
              <th className="p-3 text-start font-medium">{t("colDevice")}</th>
              <th className="p-3 text-start font-medium">{t("colStatus")}</th>
              <th className="p-3 text-start font-medium">{t("colQty")}</th>
              <th className="p-3 text-start font-medium">{t("colCondition")}</th>
              <th className="p-3 text-start font-medium">{t("colPrice")}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {devices.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted">{t("noDevices")}</td></tr>
            )}
            {devices.map((d) => {
              const img = d.images[0];
              return (
                <tr key={d.id} className="hover:bg-canvas/60">
                  <td className="p-3">
                    <Link href={`/admin/devices/${d.id}`} className="flex items-center gap-3">
                      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-canvas">
                        {img ? <Image src={img.url} alt="" width={img.width} height={img.height} className="max-h-12 w-auto object-contain" /> : <ImageOff className="size-5 text-muted/60" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-navy">{locale === "ar" ? d.nameAr || d.nameEn : d.nameEn}</span>
                        <span className="block truncate text-xs text-muted" dir="ltr">
                          {[d.sourceItemNos.length > 0 ? `#${d.sourceItemNos.join("+")}` : null, locale === "ar" ? (d.nameAr ? d.nameEn : null) : d.nameAr || null].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-3"><StatusBadge status={d.status} label={t(`status_${d.status}`)} /></td>
                  <td className="p-3 font-medium" dir="ltr">{d.quantity}</td>
                  <td className="p-3 text-muted">{t(`cond_${d.condition}`)}</td>
                  <td className="p-3" dir="ltr">{d.marketPriceOMR == null ? "—" : `${formatOMR(Number(d.marketPriceOMR))} OMR`}</td>
                  <td className="p-3 text-end"><Link href={`/admin/devices/${d.id}`} className="font-medium text-teal hover:underline">{t("edit")}</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
