import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getDevice } from "@/features/catalog/data";
import { DeviceCard } from "@/components/equipment/device-card";
import { Reveal } from "./reveal";

/** Hand-picked showcase. Phase 8 makes this selection editable from the admin page builder. */
const FEATURED = [
  "hewlett-packard-laboratory-oscilloscope",
  "rohde-schwarz-smt03-signal-generator",
  "huntron-tracker-2700",
  "stereo-inspection-microscopes",
  "metrix-ax-322-dual-dc-power-supply",
  "kh-ci-53004-plc-io-interface-module",
  "bga-rework-station",
  "bgc-8088-microengineer-v3-5",
];

export function FeaturedSection() {
  const t = useTranslations("Home");
  const locale = useLocale();
  const devices = FEATURED.map((s) => getDevice(s, locale)).filter((d) => d !== undefined);
  return (
    <section aria-labelledby="featured-title" className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 id="featured-title" className="text-h2 font-bold tracking-tight text-navy">{t("featuredTitle")}</h2>
            <p className="mt-3 text-muted">{t("featuredSubtitle")}</p>
          </div>
          <Link href="/equipment" className="group inline-flex items-center gap-2 font-semibold text-teal hover:text-navy">
            {t("viewAll")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {devices.map((d, i) => (
            <li key={d.slug}>
              <Reveal delay={(i % 4) * 0.05} className="h-full">
                <DeviceCard device={d} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
