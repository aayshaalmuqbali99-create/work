import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getDeviceForEdit } from "@/features/admin/queries";
import { formOptions } from "@/features/admin/form-options";
import inventory from "@/data/inventory-rows.json";
import { DeviceForm } from "@/components/admin/device-form";
import { StatusControls } from "@/components/admin/status-controls";
import { PhotoManager } from "@/components/admin/photo-manager";
import { Card, StatusBadge } from "@/components/admin/ui";

export default async function EditDevicePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const d = await getDeviceForEdit(id);
  if (!d) notFound();
  const t = await getTranslations("Admin");
  const opts = await formOptions(locale);
  const img = d.images[0] ?? null;
  const suggested = d.sourceItemNos.length === 1 ? inventory.rows.find((r) => r.itemNo === d.sourceItemNos[0])?.suggestedPhoto ?? null : null;
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-OM-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-5">
      <Link href="/admin/devices" className="inline-flex items-center gap-1.5 text-sm font-medium text-teal"><ArrowLeft className="size-4 rtl:-scale-x-100" />{t("devicesTitle")}</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">{locale === "ar" ? d.nameAr || d.nameEn : d.nameEn}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <StatusBadge status={d.status} label={t(`status_${d.status}`)} />
            {d.sourceItemNos.length > 0 && <span>{t("sourceItems")}: <span dir="ltr">#{d.sourceItemNos.join(" + ")}</span></span>}
          </div>
        </div>
        {d.status === "PUBLISHED" && (
          <Link href={`/equipment/${d.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-teal hover:underline">
            <ExternalLink className="size-4" />{t("openPublic")}
          </Link>
        )}
      </div>
      {d.sourceDescription && (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm"><span className="text-muted">{t("sourceDesc")}: </span><span dir="ltr" lang="en">{d.sourceDescription}</span></p>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <DeviceForm
          values={{
            id: d.id, nameEn: d.nameEn, nameAr: d.nameAr, brand: d.brand ?? "", model: d.model ?? "", slug: d.slug,
            categoryKey: d.category?.key ?? "", archetype: d.archetype ?? "", condition: d.condition, quantity: d.quantity,
            marketPrice: d.marketPriceOMR == null ? "" : String(Number(d.marketPriceOMR)),
            descEn: d.descEn, descAr: d.descAr, usesEn: d.usesEn, usesAr: d.usesAr, benefitsEn: d.benefitsEn, benefitsAr: d.benefitsAr,
          }}
          {...opts}
        />
        <div className="space-y-5">
          <Card title={t("sectionStatus")}>
            <StatusControls id={d.id} status={d.status} />
            {d.status !== "PUBLISHED" && <p className="mt-3 text-xs text-muted">{t("publishNeeds")}</p>}
          </Card>
          <Card title={t("sectionPhoto")}>
            <PhotoManager
              id={d.id}
              current={img ? { src: img.url, width: img.width, height: img.height } : null}
              currentSourcePhoto={img?.sourcePhoto ?? null}
              suggestedPhoto={suggested}
              workbookPhotos={inventory.photos}
            />
          </Card>
          <Card title={t("sectionHistory")}>
            <ul className="space-y-2 text-sm">
              {d.inventory.map((tx) => (
                <li key={tx.id} className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-0">
                  <span>
                    <span className="font-medium text-navy">{t(`txType_${tx.type}`)}</span>
                    {tx.reason && <span className="block text-xs text-muted">{tx.reason}</span>}
                    <span className="block text-xs text-muted">{fmt.format(tx.createdAt)}{tx.user ? ` · ${tx.user.name}` : ""}</span>
                  </span>
                  <span className="text-end font-mono text-xs" dir="ltr">
                    <span className={tx.delta >= 0 ? "text-emerald-700" : "text-red-600"}>{tx.delta >= 0 ? "+" : ""}{tx.delta}</span>
                    <span className="block text-muted">= {tx.quantityAfter}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
