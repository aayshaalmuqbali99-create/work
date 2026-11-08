import "server-only";
import { archetypes } from "@/components/viewer3d/archetypes";
import { getCategories } from "./queries";

export async function formOptions(locale: string) {
  const ar = locale === "ar";
  const categories = (await getCategories()).map((c) => ({ key: c.key, name: ar ? c.nameAr : c.nameEn }));
  const types = Object.values(archetypes).map((a) => ({ key: a.key, name: ar ? a.ar : a.en }));
  return { categories, archetypes: types };
}
