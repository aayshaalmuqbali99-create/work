import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const [base, facility] = await Promise.all([
    import(`../messages/${locale}.json`),
    import(`../messages/facility/${locale}.json`),
  ]);
  return {
    locale,
    // Facility Hub strings live under the "Fac" namespace.
    messages: { ...base.default, Fac: facility.default },
  };
});
