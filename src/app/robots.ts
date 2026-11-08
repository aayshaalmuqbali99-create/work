import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/ar/admin", "/en/admin", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
