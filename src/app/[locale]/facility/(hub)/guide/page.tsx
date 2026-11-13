import { getTranslations, setRequestLocale } from "next-intl/server";
import { Ban, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { CategoryIcon, AreaIcon } from "@/components/facility/icons";
import { StatusChip } from "@/components/facility/ui";
import { MILESTONES } from "@/features/facility/domain/status";
import { pickName } from "@/features/facility/format";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "Fac.Guide" });
  return { title: t("title") };
}

export default async function GuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Fac");
  const [categories, floors] = await Promise.all([
    db.facCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { issues: { where: { active: true }, orderBy: { sortOrder: "asc" } } } }),
    db.facFloor.findMany({ where: { active: true, building: { active: true } }, orderBy: [{ sortOrder: "asc" }], include: { areas: { where: { active: true }, orderBy: { sortOrder: "asc" } } } }),
  ]);
  return (
    <div className="bg-[linear-gradient(180deg,#F6F5FF_0,#ffffff_420px)] px-5 pb-10 pt-32 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-fink sm:text-5xl">{t("Guide.title")}</h1>
        <p className="mt-3 max-w-2xl text-lg text-fmuted">{t("Guide.subtitle")}</p>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-fink">{t("Guide.how")}</h2>
          <ol className="mt-5 flex flex-wrap items-center gap-2">
            {MILESTONES.map((m, i) => (
              <li key={m} className="flex items-center gap-2">
                <StatusChip status={m} label={t(`Status.${m}`)} className="px-4 py-1.5 text-sm" />
                {i < MILESTONES.length - 1 && <span className="h-px w-6 bg-lav-200" aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </section>

        {(["MAINTENANCE", "CLEANING"] as const).map((service) => (
          <section key={service} className="mt-14">
            <h2 className="text-2xl font-extrabold text-fink">{t("Guide.covers")} · {t(`Service.${service}`)}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.filter((c) => c.service === service).map((c) => (
                <article key={c.id} className="rounded-[24px] border border-fline bg-white p-5 shadow-soft">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-lav-50 text-deep"><CategoryIcon name={c.icon} className="size-5" /></span>
                    <h3 className="font-bold text-fink">{pickName(c, locale)}</h3>
                  </div>
                  {c.issues.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {c.issues.map((i) => <li key={i.id} className="rounded-full bg-lav-50 px-2.5 py-1 text-xs font-medium text-fink">{pickName(i, locale)}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-14 rounded-[28px] border border-fline bg-white p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-fink"><MapPin className="size-5 text-deep" aria-hidden="true" /> {t("Guide.areasTitle")}</h2>
          <p className="mt-2 text-sm text-fmuted">{t("Guide.areasText")}</p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {floors.map((f) => (
              <div key={f.id}>
                <p className="font-mono text-2xl font-extrabold text-deep" dir="ltr">{f.code}</p>
                <p className="text-sm text-fmuted">{pickName(f, locale)}</p>
                <ul className="mt-3 space-y-2">
                  {f.areas.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-sm font-medium text-fink">
                      <AreaIcon kind={a.kind} className="size-4 text-deep" /> {pickName(a, locale)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 flex gap-4 rounded-[28px] border border-[#FFD3A8] bg-[#FFF6EE] p-6">
          <Ban className="mt-1 size-6 shrink-0 text-[#9A4300]" aria-hidden="true" />
          <div>
            <h2 className="font-extrabold text-fink">{t("Guide.notCovered")}</h2>
            <p className="mt-1 text-sm text-fmuted">{t("Guide.notCoveredItems")}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
