import { defineRouting } from "next-intl/routing";

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "ar",
  localePrefix: "always",
});

/** Text direction per locale. Arabic is RTL, English is LTR. */
export const localeDirection: Record<Locale, "rtl" | "ltr"> = { ar: "rtl", en: "ltr" };
