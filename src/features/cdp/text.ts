/** Text normalisation shared by header matching, answer parsing, themes and redaction. */

const DASHES = /[‐-―−﹘﹣－]/g;

/** Lowercase, unify Arabic letter variants, drop diacritics/tatweel, unify dashes, collapse whitespace. */
export function normalize(s: string) {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(DASHES, "-")
    .replace(/[ً-ٰٟـ]/g, "") // harakat, superscript alef, tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[،؛؟]/g, " ") // Arabic comma, semicolon, question mark
    .replace(/[^\p{L}\p{N}\-\/]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapse runs of spaces inside each line and trim; keep the line breaks of the original text. */
export function cleanDisplay(s: string) {
  return s
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[\s ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

const STOP = new Set([
  "the", "a", "an", "of", "to", "in", "on", "for", "with", "and", "or", "was", "were", "is", "are", "did", "do", "does", "you", "your",
  "have", "has", "been", "any", "by", "from", "at", "it", "this", "that", "be", "please", "how", "what", "which", "do", "about",
  "هل", "في", "من", "على", "عن", "الى", "الي", "ما", "او", "و", "لكم", "كان", "كانت", "تم", "اي", "معكم", "التي", "الذي", "يرجى", "ذكر",
]);

/** Arabic prefixes stripped for comparison (longest first). */
const PREFIXES = ["وبال", "بال", "وال", "لل", "ال", "و", "ب", "ل"];

export function stem(token: string) {
  if (/[؀-ۿ]/.test(token)) {
    for (const p of PREFIXES) if (token.startsWith(p) && token.length - p.length >= 3) return token.slice(p.length);
    return token;
  }
  // light English stemming: plural "s", "-ed", "-ing"
  if (token.length > 4 && token.endsWith("ies")) return token.slice(0, -3) + "y";
  if (token.length > 4 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function tokens(s: string, keepStop = false) {
  return normalize(s)
    .split(/[\s\/]+/)
    .filter((t) => t && (keepStop || !STOP.has(t)))
    .map(stem);
}

/** Phrase match on normalised text with word boundaries (works for Arabic and Latin). */
export function containsPhrase(haystackNorm: string, phrase: string) {
  const p = normalize(phrase);
  if (!p) return false;
  const i = ` ${haystackNorm} `;
  if (i.includes(` ${p} `)) return true;
  // allow Arabic prefixes / English suffixes on the first and last word
  const esc = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)(?:وبال|بال|وال|لل|ال|و|ب|ل)?${esc}(?:s|es|ed|ing|ات|ه|ها|هم|كم)?(\\s|$)`).test(haystackNorm);
}
