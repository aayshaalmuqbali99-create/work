import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireFacPage } from "@/features/facility/server/guard";
import { qrSvg } from "@/features/facility/server/qr";
import { pickName } from "@/features/facility/format";
import { OmantelLogo } from "@/components/facility/brand-logo";
import { PrintButton, QrCardActions } from "@/components/facility/ops/qr-actions";

export default async function QrPage() {
  await requireFacPage("config.manage");
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const areas = await db.facArea.findMany({ where: { active: true, floor: { active: true } }, include: { floor: true }, orderBy: [{ floor: { sortOrder: "asc" } }, { sortOrder: "asc" }] });
  const cards = await Promise.all(areas.map(async (a) => ({ a, svg: await qrSvg(a.qrToken) })));
  const c = (k: string) => t(`Ops.config.${k}` as "Ops.config.code");
  return (
    <div className="mx-auto max-w-7xl">
      <div className="fh-noprint flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-fink">{c("qrTitle")}</h1>
          <p className="mt-2 max-w-2xl text-fmuted">{c("qrHelp")}</p>
        </div>
        <PrintButton />
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-3">
        {cards.map(({ a, svg }) => (
          <li key={a.id} className="break-inside-avoid rounded-[22px] border border-fline bg-white p-5 text-center">
            <div className="flex justify-center p-1"><OmantelLogo locale={locale} height={locale === "ar" ? 30 : 15} /></div>
            <p className="mt-1 text-xs font-bold text-deep">{t("Brand.name")}</p>
            <div className="mx-auto mt-3 w-40 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="mt-3 font-mono text-2xl font-extrabold text-deep" dir="ltr">{a.floor.code}</p>
            <p className="font-bold text-fink">{pickName(a, locale)}</p>
            <p className="text-xs text-fmuted">{t("Home.qrHint")}</p>
            <QrCardActions areaId={a.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
