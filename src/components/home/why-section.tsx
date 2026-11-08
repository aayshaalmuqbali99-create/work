import { useTranslations } from "next-intl";
import { Box, FileQuestion, Languages, ShieldCheck } from "lucide-react";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const items = [
  { key: "honest", icon: ShieldCheck },
  { key: "explore3d", icon: Box },
  { key: "bilingual", icon: Languages },
  { key: "quote", icon: FileQuestion },
] as const;

export function WhySection() {
  const t = useTranslations("Why");
  return (
    <section id="why" aria-labelledby="why-title" className="scroll-mt-20 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] bg-navy px-6 py-14 text-white sm:px-12">
          <div className="mb-10 max-w-2xl">
            <h2 id="why-title" className="text-h2 font-bold tracking-tight">{t("title")}</h2>
            <p className="mt-3 text-white/70">{t("subtitle")}</p>
          </div>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {items.map(({ key, icon: Icon }, i) => (
              <li key={key}>
                <Reveal delay={i * 0.06}>
                  <Icon className="mb-4 size-7 text-[#3FB8BE]" aria-hidden="true" />
                  <h3 className="font-semibold">{t(`${key}Title`)}</h3>
                  <p className="mt-2 text-sm text-white/70">{t(`${key}Desc`)}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function HowSection() {
  const t = useTranslations("How");
  const steps = ["step1", "step2", "step3"] as const;
  return (
    <section aria-labelledby="how-title" className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading id="how-title" title={t("title")} />
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s}>
              <Reveal delay={i * 0.08} className="h-full rounded-card border border-line bg-surface p-6">
                <span className="font-mono text-sm font-semibold text-teal" dir="ltr">0{i + 1}</span>
                <h3 className="mt-3 text-xl font-semibold text-navy">{t(s)}</h3>
                <p className="mt-2 text-sm text-muted">{t(`${s}Desc`)}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
