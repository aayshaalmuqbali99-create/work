export type CategoryKey = "electronics" | "electrical" | "telecom" | "microscopy" | "soldering" | "automation" | "laboratory";
export type Condition = "unverified" | "new" | "used";

export interface Device {
  slug: string;
  itemNos: number[];
  category: CategoryKey | null;
  /** Illustrative 3D device-type model key, or null when no 3D model is assigned. */
  archetype: string | null;
  brand: string | null;
  model: string | null;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  usesEn: string[];
  usesAr: string[];
  benefitsEn: string[];
  benefitsAr: string[];
  quantity: number;
  condition: Condition;
  /** Estimated price of a comparable NEW unit — never a selling price. */
  indicativeNewUnitPriceOMR: number | null;
  photo: { src: string; width: number; height: number } | null;
}

/** Bilingual view of a device for the current locale. */
export interface LocalizedDevice extends Device {
  name: string;
  altName: string;
  desc: string;
  uses: string[];
  benefits: string[];
  /** Device-type names and synonyms used by search. */
  searchText: string;
}
