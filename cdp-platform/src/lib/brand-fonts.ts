import "server-only";
import { readdirSync } from "node:fs";
import path from "node:path";

/**
 * Omantel brand typefaces: FS Alvar (English) and FS Albert (Arabic), weights Light / Regular / Bold.
 * They are licensed fonts, so they are not bundled. Put the licensed files in public/fonts/omantel/ named e.g.
 *   FSAlvar-Light.woff2, FSAlvar-Regular.woff2, FSAlvar-Bold.woff2,
 *   FSAlbertArabic-Light.woff2, FSAlbertArabic-Regular.woff2, FSAlbertArabic-Bold.woff2
 * (woff2, woff, otf or ttf). Every file found is declared with @font-face; until then the platform falls back
 * to Inter / IBM Plex Sans Arabic at the same three weights. No request is made for files that are not there.
 */
const DIR = path.join(process.cwd(), "public", "fonts", "omantel");
const WEIGHTS: Record<string, number> = { light: 300, regular: 400, book: 400, bold: 700 };
const FORMATS: Record<string, string> = { woff2: "woff2", woff: "woff", otf: "opentype", ttf: "truetype" };

let cached: string | null = null;

export function brandFontCss() {
  if (cached !== null && process.env.NODE_ENV === "production") return cached;
  let files: string[] = [];
  try {
    files = readdirSync(DIR);
  } catch {
    files = [];
  }
  const rules: string[] = [];
  for (const file of files) {
    const m = file.match(/^FS[\s_-]?(Alvar|Albert)[\s_-]?(Arabic)?[\s_-]?(Light|Regular|Book|Bold)\.(woff2|woff|otf|ttf)$/i);
    if (!m) continue;
    const family = m[1].toLowerCase() === "alvar" ? "FS Alvar" : "FS Albert Arabic";
    const weight = WEIGHTS[m[3].toLowerCase()];
    const url = `/fonts/omantel/${encodeURIComponent(file)}`;
    const families = family === "FS Albert Arabic" ? ["FS Albert Arabic", "FS Albert"] : [family];
    for (const f of families)
      rules.push(`@font-face{font-family:"${f}";src:url("${url}") format("${FORMATS[m[4].toLowerCase()]}");font-weight:${weight};font-style:normal;font-display:swap;}`);
  }
  cached = rules.join("");
  return cached;
}
