import { getTranslations } from "next-intl/server";
import { Cable, Cpu, FlaskConical, Microscope, Radio, Waves, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getStats } from "@/features/catalog/data";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/** Top-level category groups. Phase 3 replaces this list with database categories managed by the admin. */
const groups = [
  { key: "electronics", icon: Waves },
  { key: "electrical", icon: Zap },
  { key: "telecom", icon: Radio },
  { key: "microscopy", icon: Microscope },
  { key: "soldering", icon: Cable },
  { key: "automation", icon: Cpu },
  { key: "laboratory", icon: FlaskConical },
] as const;

export async function CategoriesSection() {
  const t = await getTranslations("Categories");
  const th = await getTranslations("Home");
  const counts = (await getStats()).byCategory;
  return (
    <section id="categories" aria-labelledby="categories-title" className="scroll-mt-20 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading id="categories-title" title={t("title")} subtitle={t("subtitle")} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map(({ key, icon: Icon }, i) => (
            <li key={key}>
              <Reveal delay={i * 0.05} className="h-full">
                <Link href={`/equipment?category=${key}`} className="group relative block h-full overflow-hidden rounded-card border border-line bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:border-teal/40 hover:shadow-xl hover:shadow-navy/5">
                  <span className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-teal-light text-teal transition-colors duration-300 group-hover:bg-teal group-hover:text-white">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-semibold text-navy">{t(key)}</h3>
                  <p className="mt-2 text-sm text-muted">{t(`${key}Desc`)}</p>
                  <p className="mt-4 text-sm font-semibold text-teal">{th("categoryCount", { count: counts[key] })}</p>
                  <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-teal transition-transform duration-500 group-hover:scale-x-100 rtl:origin-right" />
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
