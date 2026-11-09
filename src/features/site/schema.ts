import { z } from "zod";

/**
 * Website content & appearance edited in the control panel.
 * Empty text fields fall back to the built-in translations, so a fresh install looks complete.
 */
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const t = (max: number) => z.string().trim().max(max).default("");

export const SECTION_KEYS = ["stats", "featured", "categories", "why", "how"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const siteSchema = z.object({
  brand: z.object({
    nameEn: t(60), nameAr: t(60), taglineEn: t(120), taglineAr: t(120),
    logoUrl: z.string().max(300).nullable().default(null),
    /** Partner logo shown next to the brand in the header (e.g. the official Omantel logo file). */
    partnerLogoUrl: z.string().max(300).nullable().default(null),
  }),
  theme: z.object({
    navy: hex.default("#102F40"),
    teal: hex.default("#167D83"),
    tealLight: hex.default("#D6E9E8"),
    background: hex.default("#F4F7F8"),
    radius: z.number().int().min(0).max(32).default(14),
    animations: z.boolean().default(true),
  }),
  hero: z.object({
    eyebrowEn: t(120), eyebrowAr: t(120), titleEn: t(120), titleAr: t(120), subtitleEn: t(400), subtitleAr: t(400),
    showVisual: z.boolean().default(true),
    /** Background photos of the homepage banner (rotate automatically). */
    slides: z
      .array(z.object({ url: z.string().max(300), width: z.number().int().positive(), height: z.number().int().positive() }))
      .max(6)
      .default([
        { url: "/hero/lab-students-hd.webp", width: 1891, height: 831 },
        { url: "/hero/students.webp", width: 1520, height: 810 },
        { url: "/hero/equipment.webp", width: 1440, height: 780 },
      ]),
  }),
  // Older saved versions may miss newer sections: unknown keys are dropped and missing ones appended (visible).
  sections: z.preprocess(
    (raw) => {
      const list = Array.isArray(raw) ? (raw as { key?: string }[]).filter((s) => SECTION_KEYS.includes(s?.key as SectionKey)) : [];
      const seen = new Set(list.map((s) => s.key));
      return [...list, ...SECTION_KEYS.filter((k) => !seen.has(k)).map((key) => ({ key, enabled: true }))];
    },
    z
      .array(z.object({ key: z.enum(SECTION_KEYS), enabled: z.boolean(), titleEn: t(120), titleAr: t(120), subtitleEn: t(300), subtitleAr: t(300) }))
      .refine((a) => a.length === SECTION_KEYS.length && new Set(a.map((s) => s.key)).size === SECTION_KEYS.length, "sections"),
  ),
  footer: z.object({
    textEn: t(300), textAr: t(300), email: z.string().trim().max(120).default(""), phone: z.string().trim().max(40).default(""),
    addressEn: t(200), addressAr: t(200),
  }),
});

export type SiteContent = z.infer<typeof siteSchema>;

export const DEFAULT_SITE: SiteContent = siteSchema.parse({
  brand: {},
  theme: {},
  hero: {},
  sections: SECTION_KEYS.map((key) => ({ key, enabled: true })),
  footer: {},
});

/** Parse stored JSON; anything invalid falls back to defaults (never breaks the public site). */
export function readSite(data: unknown): SiteContent {
  const r = siteSchema.safeParse(data);
  return r.success ? r.data : DEFAULT_SITE;
}

/** WCAG contrast ratio between two hex colours. */
export function contrast(a: string, b: string) {
  const lum = (h: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
