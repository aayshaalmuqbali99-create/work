import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requirePageUser } from "@/features/admin/queries";
import { Card, StatusBadge } from "@/components/admin/ui";
import { ModelUpload } from "@/components/admin/model-upload";
import { ModelVersionActions } from "@/components/admin/model-version-actions";

export default async function ModelsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePageUser();
  const device = await db.device.findFirst({ where: { id, deletedAt: null }, include: { models3d: { orderBy: { version: "desc" } } } });
  if (!device) notFound();
  const t = await getTranslations("Admin");
  const name = locale === "ar" ? device.nameAr || device.nameEn : device.nameEn;
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-OM-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  const statusStyle = { PUBLISHED: "PUBLISHED", DRAFT: "DRAFT", ARCHIVED: "ARCHIVED" } as const;
  return (
    <div className="space-y-5">
      <Link href={`/admin/devices/${id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-teal"><ArrowLeft className="size-4 rtl:-scale-x-100" />{name}</Link>
      <h1 className="text-2xl font-bold text-navy">{t("models3dTitle")}</h1>
      <p className="text-sm text-muted">{t("models3dIntro")}</p>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          {device.models3d.length === 0 ? (
            <p className="text-sm text-muted">{t("noModels")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {device.models3d.map((m) => (
                <li key={m.id} className="space-y-3 py-4 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-navy">{t("version", { n: m.version })}</span>
                    <StatusBadge status={statusStyle[m.status]} label={t(`model_${m.status}`)} />
                    {m.verified && <StatusBadge status="PUBLISHED" label={t("verifiedLabel")} />}
                  </div>
                  <p className="text-xs text-muted">
                    <span dir="ltr">{m.fileName}</span> · <span dir="ltr">{(m.fileSize / 1024 / 1024).toFixed(2)} MB</span> · {t("triangles", { n: m.triangleCount })} · {t("partsCount", { n: (m.parts as unknown[]).length })} · {fmt.format(m.createdAt)}
                  </p>
                  <ModelVersionActions id={m.id} deviceId={id} status={m.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <ModelUpload deviceId={id} />
          <p className="mt-4 text-xs text-muted">
            {t("demoModelNote")} <a href="/demo-models/labsouq-demo-instrument.glb" download className="font-medium text-teal underline">{t("demoModel")}</a>
          </p>
        </Card>
      </div>
    </div>
  );
}
