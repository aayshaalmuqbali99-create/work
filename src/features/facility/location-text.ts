import { LOCATION_FIELDS } from "./domain/location";

type Loc = { kind: string; code: string; nameEn: string; nameAr: string } | null;

/** Exact location as readable parts: the picked specific location, then the detail fields and description. */
export function exactLocationParts(r: { location: Loc; locationDetail: unknown }, locale: string, label: (key: string) => string): string[] {
  const d = (r.locationDetail ?? {}) as Record<string, string>;
  const parts: string[] = [];
  if (r.location) parts.push([locale === "ar" ? r.location.nameAr || r.location.nameEn : r.location.nameEn || r.location.nameAr, r.location.code].filter(Boolean).join(" ") || label(`LocationKind.${r.location.kind}`));
  for (const f of LOCATION_FIELDS) if (d[f]) parts.push(`${label(`Fields.${f}`)}: ${d[f]}`);
  if (d.other) parts.push(d.other);
  return parts;
}
