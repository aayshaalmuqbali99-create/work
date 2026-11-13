import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { OmantelLogo } from "@/components/facility/brand-logo";
import { DevLoginForm } from "@/components/facility/login-form";
import { FacLanguageSwitch } from "@/components/facility/hub-header";
import { fhBtn } from "@/components/facility/ui";
import { getFacUser } from "@/features/facility/server/session";
import { devLoginEnabled, entraEnabled } from "@/features/facility/server/config-flags";
import { isGuestEmail } from "@/features/facility/server/notify";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "Fac.Login" });
  return { title: t("title") };
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 21 21" className="size-5" aria-hidden="true">
      <path fill="#f25022" d="M1 1h9v9H1z" /><path fill="#00a4ef" d="M1 11h9v9H1z" /><path fill="#7fba00" d="M11 1h9v9h-9z" /><path fill="#ffb900" d="M11 11h9v9h-9z" />
    </svg>
  );
}

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; error?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next = "", error } = await searchParams;
  const user = await getFacUser();
  if (user && !isGuestEmail(user.email)) redirect({ href: next.startsWith("/facility") ? next : "/facility", locale });
  const t = await getTranslations("Fac");
  const sso = entraEnabled();
  const dev = devLoginEnabled();

  return (
    <main id="main" className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-deep lg:block">
        <Image src="/facility/building-night.webp" alt="" fill priority sizes="50vw" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(16_6_70/0.25),rgb(16_6_70/0.85))]" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">{t("Brand.full")}</p>
          <p className="mt-3 max-w-md text-4xl font-extrabold leading-tight">{t("Home.title")}</p>
        </div>
      </section>
      <section className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/facility" className="flex items-center gap-3 p-1.5">
            <OmantelLogo locale={locale} height={locale === "ar" ? 36 : 20} priority />
            <span className="h-7 w-px bg-fline" aria-hidden="true" />
            <span className="font-bold text-deep">{t("Brand.name")}</span>
          </Link>
          <FacLanguageSwitch />
        </div>
        <div className="mx-auto my-auto w-full max-w-md py-12">
          <h1 className="text-3xl font-extrabold tracking-tight text-fink">{t("Login.title")}</h1>
          <p className="mt-2 text-fmuted">{t("Login.subtitle")}</p>
          {error === "sso" && <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{t("Login.ssoFailed")}</p>}
          <div className="mt-8">
            {sso ? (
              <a href={`/api/facility/auth/entra/start?locale=${locale}&next=${encodeURIComponent(next)}`} className={`${fhBtn.secondary} w-full min-h-13 text-base text-fink`}>
                <MicrosoftMark /> {t("Login.microsoft")}
              </a>
            ) : (
              <p className="rounded-2xl border border-fline bg-lav-50 px-4 py-3 text-sm text-fmuted">{t("Login.ssoNotConfigured")}</p>
            )}
          </div>
          {dev && (
            <div className="mt-10 rounded-[24px] border border-dashed border-lav-200 p-5">
              <h2 className="font-bold text-fink">{t("Login.devTitle")}</h2>
              <p className="mb-4 mt-1 text-sm text-fmuted">{t("Login.devNote")}</p>
              <DevLoginForm next={next} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
