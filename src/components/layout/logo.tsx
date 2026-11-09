import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type BrandProps = { name?: string; logoUrl?: string | null; partnerLogoUrl?: string | null };

/** Stacked-layers mark: assets that are reused layer after layer. */
function Mark({ inverted }: { inverted: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className="size-10 shrink-0" aria-hidden="true">
      <path d="M20 5 4 13l16 8 16-8z" fill="none" stroke={inverted ? "#ffffff" : "#102F40"} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="m4 20 16 8 16-8" fill="none" stroke="#F59E0B" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="m4 27 16 8 16-8" fill="none" stroke={inverted ? "#ffffff" : "#102F40"} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Brand: the platform mark + name (or an uploaded logo), and an optional partner logo after a divider.
 * Logos are uploaded in the control panel (Website → Brand).
 */
export function Logo({ inverted = false, brand = {} }: { inverted?: boolean; brand?: BrandProps }) {
  const t = useTranslations("Brand");
  const label = brand.name || t("name");
  return (
    <span className="inline-flex items-center gap-3">
      <Link href="/" className="group inline-flex items-center gap-2" aria-label={label}>
        {brand.logoUrl ? (
          <Image src={brand.logoUrl} alt={label} width={200} height={48} className={`h-10 w-auto object-contain ${inverted ? "rounded bg-white/90 p-1" : ""}`} />
        ) : (
          <>
            <Mark inverted={inverted} />
            <span className={`whitespace-nowrap text-lg font-bold tracking-tight sm:text-xl ${inverted ? "text-white" : "text-navy"}`}>{label}</span>
          </>
        )}
      </Link>
      {brand.partnerLogoUrl && (
        <>
          <span className={`hidden h-9 w-px sm:block ${inverted ? "bg-white/25" : "bg-line"}`} aria-hidden="true" />
          <Image src={brand.partnerLogoUrl} alt="" width={160} height={48} className={`hidden h-9 w-auto object-contain sm:block ${inverted ? "rounded bg-white/90 p-1" : ""}`} />
        </>
      )}
    </span>
  );
}
