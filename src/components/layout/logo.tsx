import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** LabSouq wordmark: a flask outline crossed by a signal trace. */
export function Logo({ inverted = false }: { inverted?: boolean }) {
  const t = useTranslations("Brand");
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label={t("name")}>
      <svg viewBox="0 0 36 36" className="size-9 shrink-0" aria-hidden="true">
        <rect width="36" height="36" rx="10" className={inverted ? "fill-white/10" : "fill-navy"} />
        <path d="M14 8h8M15.5 8v7.5L10 26a2.5 2.5 0 0 0 2.2 3.6h11.6A2.5 2.5 0 0 0 26 26l-5.5-10.5V8"
          fill="none" stroke="#D6E9E8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11.5 23.5h3l1.5-3 2.5 6 2-4.5 1.2 1.5h3" fill="none" stroke="#3FB8BE" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:-translate-y-0.5" />
      </svg>
      <span className={`text-lg font-bold tracking-tight ${inverted ? "text-white" : "text-navy"}`}>
        Lab<span className={inverted ? "text-[#3FB8BE]" : "text-teal"}>Souq</span>
      </span>
    </Link>
  );
}
