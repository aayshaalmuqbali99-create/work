import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireFacPage } from "@/features/facility/server/guard";
import { qrSvg } from "@/features/facility/server/qr";
import { pickName } from "@/features/facility/format";
import { PICKABLE_KINDS } from "@/features/facility/domain/location";
import { OmantelLogo } from "@/components/facility/brand-logo";
import { PrintButton, QrCardActions } from "@/components/facility/ops/qr-actions";
import { VerificationBadge } from "@/components/facility/ops/config-table";

/** Printable QR codes per area and per specific location, grouped by floor. Codes contain only a random token. */
export default async function QrPage() {
  await requireFacPage("config.manage");
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const live = { active: true, archivedAt: null };
  const floors = await db.facFloor.findMany({
    where: live,
    orderBy: { sortOrder: "asc" },
    include: {
      areas: { where: { ...live, isOther: false }, orderBy: { sortOrder: "asc" }, include: { wing: true } },
      locations: { where: { ...live, kind: { in: [...PICKABLE_KINDS] } }, orderBy: [{ kind: "asc" }, { sortOrder: "asc" }], include: { area: true, wing: true } },
    },
  });
  const c = (k: string) => t(`Ops.config.${k}` as "Ops.config.code");
  const groups = await Promise.all(
    floors.map(async (f) => ({
      f,
      cards: [
        ...(await Promise.all(f.areas.map(async (a) => ({ id: a.id, target: "area" as const, svg: await qrSvg(a.qrToken), title: pickName(a, locale), sub: a.wing ? pickName(a.wing, locale) : "", provisional: a.verification === "PROVISIONAL" })))),
        ...(await Promise.all(
          f.locations.map(async (l) => ({
            id: l.id,
            target: "location" as const,
            svg: await qrSvg(l.qrToken),
            title: [pickName(l, locale) || t(`LocationKind.${l.kind}` as "LocationKind.ROOM"), l.code].filter(Boolean).join(" "),
            sub: [l.area ? pickName(l.area, locale) : "", l.wing ? pickName(l.wing, locale) : ""].filter(Boolean).join(" · "),
            provisional: l.verification === "PROVISIONAL",
          })),
        )),
      ],
    })),
  );
  return (
    <div className="mx-auto max-w-7xl">
      <div className="fh-noprint flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-fink">{c("qrTitle")}</h1>
          <p className="mt-2 max-w-2xl text-fmuted">{c("qrHelp")}</p>
        </div>
        <PrintButton />
      </div>
      {groups.filter((g) => g.cards.length > 0).map(({ f, cards }) => (
        <section key={f.id} className="mt-8 break-before-page first:break-before-auto">
          <h2 className="flex items-center gap-3 text-xl font-extrabold text-fink">
            <span className="font-mono text-deep" dir="ltr">{f.code}</span> {pickName(f, locale)}
            {f.verification === "PROVISIONAL" && <span className="fh-noprint"><VerificationBadge provisional label={c("PROVISIONAL")} /></span>}
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-3">
            {cards.map((x) => (
              <li key={x.id} className="break-inside-avoid rounded-[22px] border border-fline bg-white p-5 text-center">
                <div className="flex justify-center p-1"><OmantelLogo locale={locale} height={locale === "ar" ? 30 : 15} /></div>
                <p className="mt-1 text-xs font-bold text-deep">{t("Brand.name")}</p>
                <div className="mx-auto mt-3 w-40 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: x.svg }} />
                <p className="mt-3 font-mono text-2xl font-extrabold text-deep" dir="ltr">{f.code}</p>
                <p className="font-bold text-fink">{x.title}</p>
                {x.sub && <p className="text-xs font-semibold text-fmuted">{x.sub}</p>}
                <p className="mt-1 text-xs text-fmuted">{t("Home.qrHint")}</p>
                <QrCardActions areaId={x.id} target={x.target} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
