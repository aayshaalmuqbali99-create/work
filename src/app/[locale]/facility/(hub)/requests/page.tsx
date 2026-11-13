import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { MyRequests } from "@/components/facility/my-requests";
import { fhBtn } from "@/components/facility/ui";
import { requireFacPage } from "@/features/facility/server/guard";
import { pickName } from "@/features/facility/format";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "Fac.Requests" });
  return { title: t("title") };
}

export default async function MyRequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireFacPage(undefined, "/facility/requests");
  const t = await getTranslations("Fac");
  const rows = await db.facRequest.findMany({
    where: { employeeId: user.id },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { issue: true, category: true, _count: { select: { attachments: true } } },
  });
  const cats = new Map(rows.filter((r) => r.category).map((r) => [r.category!.id, pickName(r.category, locale)]));
  return (
    <div className="bg-[linear-gradient(180deg,#F6F5FF_0,#ffffff_380px)] px-5 pb-10 pt-32 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-fink sm:text-5xl">{t("Requests.title")}</h1>
            <p className="mt-2 text-fmuted">{t("Requests.subtitle")}</p>
          </div>
          <Link href="/facility/request" className={fhBtn.accent}><Plus className="size-4" aria-hidden="true" /> {t("Nav.submit")}</Link>
        </div>
        <MyRequests
          categories={[...cats].map(([id, name]) => ({ id, name }))}
          rows={rows.map((r) => ({
            id: r.id,
            reference: r.reference,
            status: r.status,
            service: r.service,
            createdAt: r.createdAt.toISOString(),
            location: locale === "ar" ? r.locationLabelAr : r.locationLabelEn,
            issue: r.issue ? pickName(r.issue, locale) : r.issueOther,
            categoryId: r.categoryId,
            categoryName: pickName(r.category, locale),
            categoryIcon: r.category?.icon ?? "wrench",
            photos: r._count.attachments,
          }))}
        />
      </div>
    </div>
  );
}
