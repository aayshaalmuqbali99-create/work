"use client";

import { useId, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = { ar: "العربية", en: "English" };

/**
 * Segmented Arabic / English switch.
 * Keeps the current page, query string and #section when switching language.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Language");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const pillId = useId(); // unique per instance (header + footer both render a switcher)

  function switchTo(next: Locale) {
    if (next === locale) return;
    const suffix = typeof window !== "undefined" ? window.location.search + window.location.hash : "";
    startTransition(() => {
      router.replace(`${pathname}${suffix}`, { locale: next, scroll: false });
    });
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "relative inline-flex items-center rounded-full border border-line bg-surface p-1 text-sm font-medium",
        isPending && "opacity-70",
        className,
      )}
    >
      {routing.locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={active}
            onClick={() => switchTo(l)}
            className={cn(
              "relative z-10 rounded-full px-3.5 py-1.5 transition-colors duration-200",
              active ? "text-white" : "text-muted hover:text-navy",
              l === "ar" && "font-arabic",
            )}
          >
            {active && (
              <motion.span
                layoutId={`lang-pill-${pillId}`}
                className="absolute inset-0 -z-10 rounded-full bg-navy"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
