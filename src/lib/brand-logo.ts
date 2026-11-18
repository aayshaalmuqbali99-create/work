import "server-only";
import { readdirSync } from "node:fs";
import path from "node:path";

/**
 * Official Omantel logo files in public/brand/omantel/ (see the README there):
 * omantel-logo-en.*, omantel-logo-bilingual.*, and optional reversed "-white" versions for Deep Sea backgrounds.
 * Arabic pages use the bilingual logo; English pages the English logo, falling back to the bilingual one.
 * Without official files, `fallback` (the logo uploaded in Website → Brand) is used.
 */
const DIR = path.join(process.cwd(), "public", "brand", "omantel");

function files() {
  try {
    return readdirSync(DIR);
  } catch {
    return [];
  }
}

export function omantelLogo(locale: string, fallback: string | null, opts: { onDark?: boolean } = {}): { src: string; official: boolean; onDark: boolean } | null {
  const all = files();
  const find = (base: string) => all.find((f) => new RegExp(`^${base}\\.(svg|png|webp)$`, "i").test(f));
  const order = locale === "en" ? ["omantel-logo-en", "omantel-logo-bilingual"] : ["omantel-logo-bilingual", "omantel-logo-en"];
  for (const base of order) {
    const white = opts.onDark ? find(`${base}-white`) : undefined;
    const file = white ?? find(base);
    if (file) return { src: `/brand/omantel/${file}`, official: true, onDark: !!white };
  }
  return fallback ? { src: fallback, official: false, onDark: false } : null;
}
