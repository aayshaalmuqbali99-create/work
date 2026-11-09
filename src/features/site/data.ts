import "server-only";
import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { readSite, type SiteContent } from "./schema";

export const SITE_TAG = "site";

const loadPublished = unstable_cache(
  async () => {
    const v = await db.siteVersion.findFirst({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } });
    return readSite(v?.data);
  },
  ["site-published-v5"],
  { tags: [SITE_TAG], revalidate: 3600 },
);

/** Published content for visitors; the DRAFT for signed-in editors who turned preview mode on. */
export async function getSiteContent(): Promise<{ site: SiteContent; preview: boolean }> {
  if ((await draftMode()).isEnabled && (await getCurrentUser())) {
    const draft = await db.siteVersion.findFirst({ where: { status: "DRAFT" }, orderBy: { updatedAt: "desc" } });
    if (draft) return { site: readSite(draft.data), preview: true };
  }
  // Re-validate cached content too, so sections added in newer versions always appear.
  return { site: readSite(await loadPublished()), preview: false };
}

/** Pick the locale field, falling back to the translation when the editor left it empty. */
export function pick(obj: Record<string, unknown>, base: string, locale: string, fallback: string): string {
  const v = obj[`${base}${locale === "ar" ? "Ar" : "En"}`];
  return typeof v === "string" && v.trim() ? v : fallback;
}
