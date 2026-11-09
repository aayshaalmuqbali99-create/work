import { getTranslations } from "next-intl/server";
import { Box, Cpu, LayoutGrid, Package } from "lucide-react";
import { getStats } from "@/features/catalog/data";
import { archetypes } from "@/components/viewer3d/archetypes";
import { CountUp } from "./count-up";
import type { SectionText } from "./types";

export async function StatsSection({ text = {} }: { text?: SectionText }) {
  const t = await getTranslations("Home");
  const s = await getStats();
  const categories = Object.values(s.byCategory).filter((n) => n > 0).length;
  const items = [
    { value: s.devices, label: t("statDevices"), icon: Cpu },
    { value: s.units, label: t("statUnits"), icon: Package },
    { value: categories, label: t("statCategories"), icon: LayoutGrid },
    { value: Object.keys(archetypes).length, label: t("statModels"), icon: Box },
  ];
  return (
    <section aria-label={text.title || t("statsTitle")} className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-[26px] bg-gradient-to-r from-[#0d2440] via-[#102f40] to-[#0d2440] shadow-2xl shadow-navy/20 lg:grid-cols-4">
          {items.map(({ value, label, icon: Icon }) => (
            <li key={label} className="flex flex-col items-center gap-2 bg-white/[0.02] px-4 py-8 text-center text-white">
              <Icon className="size-6 text-[#3FB8BE]" aria-hidden="true" />
              <span className="text-4xl font-bold sm:text-5xl"><CountUp value={value} /></span>
              <span className="text-sm text-white/70">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
