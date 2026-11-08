export type CategoryKey = "electronics" | "electrical" | "telecom" | "microscopy" | "soldering" | "automation" | "laboratory";
export type Condition = "unverified" | "new" | "used";

export interface Device {
  slug: string;
  itemNos: number[];
  category: CategoryKey;
  archetype: string;
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
  /** Indicative price of a comparable NEW unit from the workbook — never a selling price. */
  indicativeNewUnitPriceOMR: number | null;
  photo: { src: string; width: number; height: number; sourcePhoto: number };
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
