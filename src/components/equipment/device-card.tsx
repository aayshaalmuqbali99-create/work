import Image from "next/image";
import { useTranslations } from "next-intl";
import { Box, ImageOff, Package } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { LocalizedDevice } from "@/features/catalog/types";
import { formatOMR } from "@/features/catalog/format";

export function DeviceCard({ device }: { device: LocalizedDevice }) {
  const t = useTranslations("Equipment");
  const tc = useTranslations("Categories");
  return (
    <Link
      href={`/equipment/${device.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition duration-300 hover:-translate-y-1 hover:border-teal/40 hover:shadow-xl hover:shadow-navy/5"
    >
      <div className="relative grid h-44 place-items-center bg-gradient-to-b from-canvas to-teal-light/40 p-4">
        {device.photo ? (
          <Image
            src={device.photo.src}
            alt={device.name}
            width={device.photo.width}
            height={device.photo.height}
            className="max-h-36 w-auto rounded-md object-contain shadow-sm transition duration-500 group-hover:scale-105"
          />
        ) : (
          <ImageOff className="size-10 text-muted/50" aria-label={t("notProvided")} />
        )}
        {(device.archetype || device.model3d) && (
          <span className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full bg-navy px-2 py-0.5 text-[11px] font-semibold text-white">
            <Box className="size-3" aria-hidden="true" />
            {t("has3d")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold text-teal">{device.category ? tc(device.category) : "\u00a0"}</p>
        <h3 className="mt-1 line-clamp-2 font-semibold leading-snug text-navy">{device.name}</h3>
        {(device.brand || device.model) && (
          <p className="mt-1 truncate text-xs text-muted" dir="ltr">{[device.brand, device.model].filter(Boolean).join(" · ")}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-ink">
            <Package className="size-4 text-teal" aria-hidden="true" />
            {t("units", { count: device.quantity })}
          </span>
          {device.indicativeNewUnitPriceOMR != null && (
            <span className="text-end">
              <span className="block text-[11px] text-muted">{t("marketPrice")}</span>
              <span className="font-semibold text-navy">
                ≈ {formatOMR(device.indicativeNewUnitPriceOMR)} {t("currency")}
              </span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
