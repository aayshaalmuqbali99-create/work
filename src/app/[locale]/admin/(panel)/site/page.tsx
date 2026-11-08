import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requirePageUser } from "@/features/admin/queries";
import { DEFAULT_SITE, readSite } from "@/features/site/schema";
import { SiteEditor } from "@/components/admin/site-editor";

export default async function SitePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requirePageUser();
  if (me.role !== "ADMIN") redirect({ href: "/admin", locale: await getLocale() });
  const t = await getTranslations("Admin");
  const [draft, published, versions] = await Promise.all([
    db.siteVersion.findFirst({ where: { status: "DRAFT" } }),
    db.siteVersion.findFirst({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } }),
    db.siteVersion.findMany({ where: { status: { in: ["PUBLISHED", "ARCHIVED"] } }, orderBy: { publishedAt: "desc" }, take: 30, include: { createdBy: { select: { name: true } } } }),
  ]);
  const initial = draft ? readSite(draft.data) : published ? readSite(published.data) : DEFAULT_SITE;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">{t("siteTitle")}</h1>
      <p className="text-sm text-muted">{t("siteIntro")}</p>
      <SiteEditor
        initial={initial}
        published={published ? readSite(published.data) : null}
        versions={versions.map((v) => ({ id: v.id, status: v.status, note: v.note, publishedAt: v.publishedAt?.toISOString() ?? null, by: v.createdBy?.name ?? null }))}
      />
    </div>
  );
}
