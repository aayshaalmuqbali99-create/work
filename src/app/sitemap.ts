import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Public pages + every published device, in both languages with hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const devices = await db.device.findMany({ where: { status: "PUBLISHED", deletedAt: null }, select: { slug: true, updatedAt: true } });
  const paths = [{ path: "", updatedAt: new Date() }, { path: "/equipment", updatedAt: new Date() }, { path: "/about", updatedAt: new Date() }, ...devices.map((d) => ({ path: `/equipment/${d.slug}`, updatedAt: d.updatedAt }))];
  return paths.flatMap(({ path, updatedAt }) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: updatedAt,
      alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
    })),
  );
}
