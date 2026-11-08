import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requirePageUser } from "@/features/admin/queries";
import type { PartInfo } from "@/components/viewer3d/types";
import { ModelEditor } from "@/components/admin/model-editor";
import { ModelVersionActions } from "@/components/admin/model-version-actions";
import { StatusBadge } from "@/components/admin/ui";

export default async function ModelEditorPage({ params }: { params: Promise<{ locale: string; id: string; modelId: string }> }) {
  const { locale, id, modelId } = await params;
  setRequestLocale(locale);
  await requirePageUser();
  const model = await db.device3DModel.findFirst({ where: { id: modelId, deviceId: id }, include: { device: { select: { nameEn: true, nameAr: true } } } });
  if (!model) notFound();
  const t = await getTranslations("Admin");
  const name = locale === "ar" ? model.device.nameAr || model.device.nameEn : model.device.nameEn;
  return (
    <div className="space-y-5">
      <Link href={`/admin/devices/${id}/models`} className="inline-flex items-center gap-1.5 text-sm font-medium text-teal"><ArrowLeft className="size-4 rtl:-scale-x-100" />{t("back3d")}</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-navy">{name} · {t("version", { n: model.version })}</h1>
        <StatusBadge status={model.status} label={t(`model_${model.status}`)} />
      </div>
      <ModelVersionActions id={model.id} deviceId={id} status={model.status} />
      <ModelEditor modelId={model.id} url={model.fileUrl} initialParts={model.parts as unknown as (PartInfo & { node: string })[]} deviceName={name} />
    </div>
  );
}
