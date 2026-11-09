import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { requirePageUser } from "@/features/admin/queries";
import { Card, StatusBadge } from "@/components/admin/ui";
import { RequestControls } from "@/components/admin/request-row";

type Item = { slug: string; nameEn: string; nameAr: string; quantity: number };
const BADGE = { NEW: "REVIEW", IN_REVIEW: "DRAFT", APPROVED: "PUBLISHED", REJECTED: "ARCHIVED", COMPLETED: "PUBLISHED" } as const;

export default async function RequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageUser();
  const t = await getTranslations("Admin");
  const requests = await db.assetRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-OM-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-navy">{t("requestsTitle")}</h1>
      {requests.length === 0 ? (
        <Card><p className="text-sm text-muted">{t("noRequests")}</p></Card>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <li key={r.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={BADGE[r.status]} label={t(`rstatus_${r.status}`)} />
                      <span className="rounded-full bg-[#e8f0fe] px-2.5 py-0.5 text-xs font-semibold text-[#1b6fd1]">{t(`rtype_${r.type}`)}</span>
                      <time className="text-xs text-muted">{fmt.format(r.createdAt)}</time>
                    </div>
                    <p className="mt-2 font-semibold text-navy">{r.name} · {r.organization}{r.city ? ` · ${r.city}` : ""}</p>
                    <p className="mt-1 flex flex-wrap gap-4 text-sm text-muted">
                      <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:text-teal" dir="ltr"><Mail className="size-4" />{r.email}</a>
                      <a href={`tel:${r.phone.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-1 hover:text-teal" dir="ltr"><Phone className="size-4" />{r.phone}</a>
                    </p>
                  </div>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {(r.items as unknown as Item[]).map((it) => (
                    <li key={it.slug} className="rounded-lg bg-canvas px-3 py-1.5 text-sm">
                      {locale === "ar" ? it.nameAr || it.nameEn : it.nameEn} <span className="font-semibold text-navy" dir="ltr">× {it.quantity}</span>
                    </li>
                  ))}
                </ul>
                {r.message && <p className="mt-3 whitespace-pre-line rounded-lg border border-line p-3 text-sm text-ink">{r.message}</p>}
                <div className="mt-4 border-t border-line pt-4">
                  <RequestControls id={r.id} status={r.status} note={r.adminNote} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
