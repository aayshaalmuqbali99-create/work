import { THEMES } from "./config";
import { normalize, tokens } from "./text";

/**
 * Best-effort removal of identifying details from free text shown to management:
 * e-mail addresses, phone and employee numbers, words that follow a title (Eng., Mr., المهندس…),
 * and any word that appears in a respondent-name or "people who supported" answer of the same file.
 * Original texts stay available, unchanged, to authorised users only.
 */

const COMMON = new Set(
  [
    "team", "teams", "huawei", "oms", "omantel", "all", "everyone", "every", "member", "members", "staff", "engineer", "engineers", "eng",
    "mr", "mrs", "ms", "dr", "the", "and", "for", "from", "with", "thanks", "thank", "you", "they", "their", "his", "her", "who", "support",
    "manager", "supervisor", "trainer", "trainers", "colleagues", "colleague", "department", "section", "unit", "group", "none", "nothing",
    "هواوي", "عمانتل", "فريق", "الفريق", "الجميع", "جميع", "كل", "مهندس", "المهندس", "المهندسين", "شكرا", "الشكر", "الاخ", "الاخت", "الاستاذ",
    "السيد", "الدكتور", "الزملاء", "زملاء", "المدير", "المشرف", "المدرب", "المدربين", "قسم", "القسم", "لا", "يوجد", "لايوجد", "وكل", "من", "الى",
    "على", "في", "مع", "عن", "هم", "هو", "هي", "الذين", "الذي", "بن", "bin", "bint", "بنت", "ال", "al", "el",
  ].map((w) => normalize(w)),
);

for (const t of THEMES) for (const k of t.keywords) for (const w of tokens(k, true)) COMMON.add(w);

const TITLES = new Set(["eng", "mr", "mrs", "ms", "miss", "dr", "م", "د", "مهندس", "المهندس", "المهندسه", "الاستاذ", "الاستاذه", "استاذ", "الاخ", "الاخت", "السيد", "السيده", "الدكتور", "الدكتوره"].map(normalize));

const ARABIC_PREFIX = /^(?:وبال|بال|وال|لل|ال|و|ب|ل)/;
const bare = (w: string) => {
  const n = normalize(w);
  return /[؀-ۿ]/.test(n) && n.length > 4 ? n.replace(ARABIC_PREFIX, "") : n;
};

export function buildNameDictionary(sources: string[], extraCommon: string[] = []) {
  const extra = new Set(extraCommon.flatMap((s) => tokens(s, true)));
  const dict = new Set<string>();
  for (const s of sources)
    for (const w of normalize(s).split(/[\s,،;\/&+\-]+/)) {
      if (w.length < 3 || /\d/.test(w) || COMMON.has(w) || extra.has(w)) continue;
      dict.add(w);
      dict.add(bare(w));
    }
  return dict;
}

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const NUMBER = /(\+?\d[\d\s-]{5,}\d)|\b\d{4,}\b/g;

export function redact(text: string, dict: Set<string>) {
  const cleaned = text.replace(EMAIL, "[•]").replace(NUMBER, "[#]");
  const parts = cleaned.split(/(\s+)/);
  let afterTitle = 0;
  return parts
    .map((part) => {
      if (/^\s+$/.test(part) || !part) return part;
      const n = normalize(part);
      const isArabic = /[؀-ۿ]/.test(part);
      const label = isArabic ? "[اسم]" : "[name]";
      const trail = part.match(/[.,،؛;:!?؟)"'»]+$/)?.[0] ?? "";
      if (TITLES.has(n.replace(/\.$/, "")) || TITLES.has(normalize(part.replace(/[.]/g, "")))) {
        afterTitle = 2;
        return part;
      }
      if (afterTitle > 0 && n && !COMMON.has(n)) {
        afterTitle = trail ? 0 : afterTitle - 1;
        return label + trail;
      }
      afterTitle = 0;
      if (n.length >= 3 && (dict.has(n) || dict.has(bare(part)))) return label + trail;
      return part;
    })
    .join("")
    .replace(/(\[(?:اسم|name)\])(\s+\1)+/g, "$1");
}
