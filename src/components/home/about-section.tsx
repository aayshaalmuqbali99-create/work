import { getTranslations } from "next-intl/server";
import { CheckCircle2, GraduationCap, HandHeart, ShoppingBag } from "lucide-react";
import { Reveal } from "./reveal";
import type { SectionText } from "./types";

/** About the platform + its two goals (support education; donate or sell). */
export async function GoalsSection({ text = {} }: { text?: SectionText }) {
  const t = await getTranslations("Home");
  const goals = [
    { tag: t("goal1Tag"), title: t("goal1Title"), subtitle: t("goal1Subtitle"), desc: t("goal1Desc"), points: t("goal1Points").split("|"), icon: GraduationCap, accent: "from-[#167d83] to-[#3FB8BE]" },
    { tag: t("goal2Tag"), title: t("goal2Title"), subtitle: t("goal2Subtitle"), desc: t("goal2Desc"), points: t("goal2Points").split("|"), icon: HandHeart, accent: "from-[#1b6fd1] to-[#6aa8ff]", icon2: ShoppingBag },
  ];
  return (
    <section aria-labelledby="goals-title" className="relative overflow-hidden py-16">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-teal-light/50 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 id="goals-title" className="text-h2 font-bold tracking-tight text-navy">{text.title || t("goalsTitle")}</h2>
        </Reveal>
        <ul className="mt-10 grid gap-6 lg:grid-cols-2">
          {goals.map((g, i) => {
            const Icon = g.icon;
            return (
              <li key={g.title}>
                <Reveal delay={i * 0.12} className="h-full">
                  <article className={`group relative h-full rounded-[26px] bg-gradient-to-br ${g.accent} p-[1.5px] shadow-xl shadow-navy/10 transition duration-500 hover:-translate-y-1.5 hover:shadow-2xl`}>
                    <div className="relative h-full overflow-hidden rounded-[25px] bg-surface p-7 sm:p-9">
                      <span aria-hidden="true" className={`absolute -end-10 -top-10 size-40 rounded-full bg-gradient-to-br ${g.accent} opacity-10 transition-transform duration-700 group-hover:scale-125`} />
                      <div className="flex items-center gap-4">
                        <span className={`grid size-14 place-items-center rounded-2xl bg-gradient-to-br ${g.accent} text-white shadow-lg`}>
                          <Icon className="size-7" aria-hidden="true" />
                        </span>
                        <span className="rounded-full bg-canvas px-3 py-1 text-xs font-bold text-navy">{g.tag}</span>
                      </div>
                      <h4 className="mt-6 text-2xl font-bold text-navy">
                        <span className="font-mono text-teal" dir="ltr">0{i + 1}</span> <span className="text-line">|</span> {g.title}
                      </h4>
                      <p className="mt-2 text-lg font-semibold text-teal">{g.subtitle}</p>
                      <p className="mt-4 leading-relaxed text-muted">{g.desc}</p>
                      <ul className="mt-6 space-y-3">
                        {g.points.map((p) => (
                          <li key={p} className="flex items-start gap-2.5 font-medium text-ink">
                            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden="true" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
