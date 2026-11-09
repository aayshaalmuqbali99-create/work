import { getTranslations } from "next-intl/server";
import { ChevronsDown, GraduationCap, Layers, Sprout } from "lucide-react";
import { Reveal } from "./reveal";

/** Three highlights under the banner (education, reuse, sustainability). */
export async function FeaturesSection() {
  const t = await getTranslations("Home");
  const items = [
    { title: t("f1Title"), desc: t("f1Desc"), icon: GraduationCap, tone: "bg-[#e8f0fe] text-[#1b6fd1]" },
    { title: t("f2Title"), desc: t("f2Desc"), icon: Layers, tone: "bg-amber-100 text-amber-600" },
    { title: t("f3Title"), desc: t("f3Desc"), icon: Sprout, tone: "bg-emerald-100 text-emerald-700" },
  ];
  return (
    <section aria-label={t("f1Title")} className="relative bg-[#f6f8fc] pb-14 pt-6">
      <div aria-hidden="true" className="absolute -bottom-10 start-0 -z-0 h-40 w-1/2 rounded-[50%] bg-white/60 blur-2xl" />
      <ul className="relative mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-3 md:gap-0 lg:px-8">
        {items.map(({ title, desc, icon: Icon, tone }, i) => (
          <li key={title} className="md:border-s md:border-line md:px-8 md:first:border-s-0">
            <Reveal delay={i * 0.1} className="flex flex-col items-center text-center">
              <span className={`grid size-20 place-items-center rounded-3xl shadow-sm ${tone}`}>
                <Icon className="size-10" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-2xl font-bold text-navy">{title}</h2>
              <p className="mt-2 max-w-xs text-lg leading-relaxed text-muted">{desc}</p>
            </Reveal>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex justify-center">
        <a href="#site-footer" aria-label={t("more")} className="grid size-11 place-items-center rounded-full text-[#1b6fd1] transition hover:bg-white">
          <ChevronsDown className="size-7 animate-bounce motion-reduce:animate-none" />
        </a>
      </div>
    </section>
  );
}
