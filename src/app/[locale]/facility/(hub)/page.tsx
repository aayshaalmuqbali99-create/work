import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, ClipboardList, Map as MapIcon, QrCode, ShieldAlert, Inbox } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { QrScanButton } from "@/components/facility/qr-scanner";
import { ServiceScene } from "@/components/facility/service-scene";
import { EmptyState, StatusChip, fhBtn, Spark } from "@/components/facility/ui";
import { getFacUser } from "@/features/facility/server/session";
import { openAccess } from "@/features/facility/server/config-flags";
import { myRecentRequests } from "@/features/facility/server/queries";
import { formatDate, pickName } from "@/features/facility/format";
import { progressOf } from "@/features/facility/domain/status";

export default async function FacilityHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, user] = await Promise.all([getTranslations("Fac"), getFacUser()]);
  const recent = user ? await myRecentRequests(user.id) : [];
  const open = openAccess();
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <>
      {/* ---------- Cinematic hero ---------- */}
      <section className="relative isolate flex min-h-[86svh] items-end overflow-hidden bg-deep text-white" aria-labelledby="fh-hero-title">
        <Image
          src="/facility/building-night.webp"
          alt=""
          fill
          priority
          quality={92}
          sizes="100vw"
          className="fh-zoom object-cover object-[50%_45%]"
        />
        {/* readability overlay: Deep Sea tint, strongest behind the text */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(16_6_70/0.55)_0%,rgb(16_6_70/0.2)_38%,rgb(16_6_70/0.6)_70%,rgb(16_6_70/0.88)_100%)]" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-32 pt-32 sm:px-8 sm:pb-40">
          <div className="fh-rise flex w-fit items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-md">
            <Spark />
            <div className="leading-tight">
              <p className="font-arabic text-base font-bold" lang="ar" dir="rtl">عمليات وصيانة المرافق</p>
              <p className="text-xs font-semibold tracking-wide text-white/85" lang="en" dir="ltr">Facility Operations &amp; Maintenance</p>
            </div>
          </div>
          <h1 id="fh-hero-title" className="fh-rise fh-d1 mt-5 max-w-4xl text-hero font-extrabold tracking-tight">
            {t("Home.title")}
          </h1>
          <p className="fh-rise fh-d2 mt-4 max-w-3xl text-2xl font-bold text-white sm:text-3xl">
            <span className="bg-[linear-gradient(transparent_62%,rgb(255_120_0/0.55)_62%)] box-decoration-clone px-1">{t("Home.subtitle")}</span>
          </p>
          <p className="fh-rise fh-d2 mt-6 max-w-2xl text-lg leading-relaxed text-white/85">{t("Home.description")}</p>
          <div className="fh-rise fh-d3 mt-8 flex flex-wrap gap-3">
            <Link href="/facility/request" className={cn(fhBtn.accent, "min-h-13 px-7 text-base")}>
              {t("Home.report")} <Arrow className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/facility/requests" className={cn(fhBtn.onDark, "min-h-13 px-7 text-base")}>
              {t("Home.track")}
            </Link>
          </div>
        </div>
        <a href="#services" className="fh-cue absolute bottom-24 start-1/2 z-10 hidden -translate-x-1/2 rounded-full p-2 text-white/80 hover:text-white sm:block rtl:translate-x-1/2" aria-label={t("Home.scroll")}>
          <ChevronDown className="size-7" />
        </a>
        {/* soft curve into the next section */}
        <svg className="absolute inset-x-0 -bottom-px z-10 h-16 w-full sm:h-24" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 100V60C240 10 480 0 720 20s480 70 720 30v50Z" fill="#ffffff" />
        </svg>
      </section>

      {/* ---------- Service cards ---------- */}
      <section id="services" className="relative mx-auto max-w-7xl scroll-mt-24 px-5 pt-8 sm:px-8" aria-labelledby="fh-services-title">
        <div className="max-w-2xl">
          <h2 id="fh-services-title" className="text-title font-extrabold tracking-tight text-fink">{t("Home.servicesTitle")}</h2>
          <p className="mt-3 text-lg text-fmuted">{t("Home.servicesSubtitle")}</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {(
            [
              { key: "maintenance", service: "MAINTENANCE", tile: "bg-[linear-gradient(145deg,#ECEAFF,#F8F7FF)]", chip: "bg-deep text-white" },
              { key: "cleaning", service: "CLEANING", tile: "bg-[linear-gradient(145deg,#FFEAD8,#FFF8F1)]", chip: "bg-gold text-fink" },
            ] as const
          ).map(({ key, service, tile, chip }) => (
            <Link
              key={key}
              href={{ pathname: "/facility/request", query: { service } }}
              className="group flex items-start gap-5 rounded-[28px] border border-fline bg-white p-6 shadow-soft transition duration-300 ease-out hover:-translate-y-1 hover:border-lav-200 hover:shadow-lift sm:p-7"
            >
              <ServiceScene kind={key} className={cn("size-24 shrink-0 rounded-[26px] transition duration-300 group-hover:scale-105 sm:size-28", tile)} />
              <div className="min-w-0 flex-1">
                <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-bold", chip)}>{t(`Service.${service}`)}</span>
                <h3 className="mt-2 text-2xl font-extrabold text-fink">{t(`Home.${key}Title`)}</h3>
                <p className="mt-2 leading-relaxed text-fmuted">{t(`Home.${key}Text`)}</p>
                <p className="mt-3 text-sm font-medium text-deep/80">{t(`Home.${key}Tags`)}</p>
                <span className="mt-5 inline-flex items-center gap-2 font-bold text-deep">
                  {t(`Home.${key}Cta`)}
                  <span className="grid size-8 place-items-center rounded-full bg-deep text-white transition duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                    <Arrow className="size-4" aria-hidden="true" />
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Quick access ---------- */}
      <section className="mx-auto mt-14 max-w-7xl px-5 sm:px-8" aria-labelledby="fh-quick-title">
        <h2 id="fh-quick-title" className="text-xl font-extrabold text-fink">{t("Home.quickTitle")}</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {(
            [
              { href: "/facility/requests", icon: ClipboardList, title: "quickMy", text: "quickMyText" },
              { qr: true, icon: QrCode, title: "quickQr", text: "quickQrText" },
              { href: "/facility/map", icon: MapIcon, title: "quickMap", text: "quickMapText" },
              { href: "/facility/guide", icon: BookOpen, title: "quickGuide", text: "quickGuideText" },
            ] as const
          ).map((q) => {
            const inner = (
              <>
                <span className="grid size-12 place-items-center rounded-2xl bg-lav-50 text-deep transition duration-300 group-hover:bg-deep group-hover:text-white">
                  <q.icon className="size-6" aria-hidden="true" />
                </span>
                <span className="mt-4 block text-base font-bold text-fink">{t(`Home.${q.title}`)}</span>
                <span className="mt-1 block text-sm text-fmuted">{t(`Home.${q.text}`)}</span>
              </>
            );
            const cls = "group block rounded-[24px] border border-fline bg-white p-5 text-start shadow-soft transition duration-300 hover:-translate-y-1 hover:border-lav-200 hover:shadow-lift";
            return "qr" in q ? (
              <QrScanButton key={q.title} className={cls}>{inner}</QrScanButton>
            ) : (
              <Link key={q.title} href={q.href} className={cls}>{inner}</Link>
            );
          })}
        </div>
      </section>

      {/* ---------- My recent requests ---------- */}
      <section className="mx-auto mt-14 max-w-7xl px-5 sm:px-8" aria-labelledby="fh-recent-title">
        <div className="flex items-end justify-between gap-4">
          <h2 id="fh-recent-title" className="text-xl font-extrabold text-fink">{t("Home.recentTitle")}</h2>
          {user && recent.length > 0 && (
            <Link href="/facility/requests" className={fhBtn.ghost}>
              {t("Home.recentAll")} <Arrow className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        <div className="mt-5">
          {!user ? (
            <EmptyState
              icon={<Inbox className="size-7" />}
              title={open ? t("Home.recentEmpty") : t("Home.signInPrompt")}
              action={open ? <Link href="/facility/request" className={fhBtn.primary}>{t("Home.report")}</Link> : <Link href="/facility/login" className={fhBtn.primary}>{t("Nav.signIn")}</Link>}
            />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-7" />}
              title={t("Home.recentEmpty")}
              action={<Link href="/facility/request" className={fhBtn.primary}>{t("Home.report")}</Link>}
            />
          ) : (
            <ul className="grid gap-4 md:grid-cols-3">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/facility/requests/${r.reference}`} className="group block rounded-[24px] border border-fline bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-deep" dir="ltr">{r.reference}</span>
                      <StatusChip status={r.status} label={t(`Status.${r.status}`)} />
                    </div>
                    <p className="mt-3 line-clamp-1 font-bold text-fink">{r.issue ? pickName(r.issue, locale) : r.issueOther}</p>
                    <p className="mt-1 line-clamp-1 text-sm text-fmuted">{locale === "ar" ? r.locationLabelAr : r.locationLabelEn}</p>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-lav-100">
                      <div className="h-full rounded-full bg-deep transition-all" style={{ width: `${progressOf(r.status) * 100}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-fmuted">{t("Requests.submittedOn", { date: formatDate(r.createdAt, locale) })}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ---------- The building (real photography) ---------- */}
      <section className="mx-auto mt-20 max-w-7xl px-5 sm:px-8" aria-labelledby="fh-building-title">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.14em] text-deep"><Spark /> {t("Home.bridgeEyebrow")}</p>
            <h2 id="fh-building-title" className="mt-3 text-title font-extrabold tracking-tight text-fink">{t("Home.buildingTitle")}</h2>
            <p className="mt-4 text-lg leading-relaxed text-fmuted">{t("Home.buildingText")}</p>
            <h3 className="mt-8 text-sm font-bold uppercase tracking-[0.14em] text-fmuted">{t("Home.stepsTitle")}</h3>
            <ol className="mt-4 space-y-5">
              {[1, 2, 3].map((n) => (
                <li key={n} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-deep text-sm font-bold text-white">{n}</span>
                  <div>
                    <p className="font-bold text-fink">{t(`Home.step${n}`)}</p>
                    <p className="text-sm text-fmuted">{t(`Home.step${n}Text`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid grid-cols-6 grid-rows-[repeat(6,minmax(0,52px))] gap-3 sm:grid-rows-[repeat(6,minmax(0,72px))]">
            <figure className="relative col-span-4 row-span-4 overflow-hidden rounded-[28px] shadow-lift">
              <Image src="/facility/building-night.webp" alt="" fill sizes="(min-width: 1024px) 40vw, 66vw" className="object-cover" />
            </figure>
            <figure className="relative col-span-2 row-span-3 overflow-hidden rounded-[24px]">
              <Image src="/facility/structure.webp" alt="" fill sizes="20vw" className="object-cover" />
            </figure>
            <figure className="relative col-span-2 row-span-3 overflow-hidden rounded-[24px]">
              <Image src="/facility/pendant-lights.webp" alt="" fill sizes="20vw" className="object-cover" />
            </figure>
            <figure className="relative col-span-3 row-span-2 overflow-hidden rounded-[24px]">
              <Image src="/facility/atrium.webp" alt="" fill sizes="30vw" className="object-cover" />
            </figure>
            <figure className="relative col-span-1 row-span-2 overflow-hidden rounded-[20px]">
              <Image src="/facility/workspace-carpet.webp" alt="" fill sizes="12vw" className="object-cover" />
            </figure>
          </div>
        </div>
      </section>

      {/* ---------- Safety ---------- */}
      <section className="mx-auto mt-16 max-w-7xl px-5 sm:px-8" aria-labelledby="fh-safety-title">
        <div className="flex flex-col gap-5 rounded-[28px] border border-[#FFD3A8] bg-[#FFF6EE] p-6 sm:flex-row sm:items-center sm:p-8">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gold text-fink"><ShieldAlert className="size-7" aria-hidden="true" /></span>
          <div>
            <h2 id="fh-safety-title" className="text-lg font-extrabold text-fink">{t("Home.safetyTitle")}</h2>
            <p className="mt-1 text-fmuted">{t("Home.safetyText")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
