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
    "however", "also", "unfortunately", "therefore", "moreover", "additionally", "please", "currently", "finally",
  ].map((w) => normalize(w)),
);

for (const t of THEMES) for (const k of t.keywords) for (const w of tokens(k, true)) COMMON.add(w);

const TITLES = new Set(["eng", "mr", "mrs", "ms", "miss", "dr", "م", "د", "مهندس", "المهندس", "المهندسه", "الاستاذ", "الاستاذه", "استاذ", "الاخ", "الاخت", "السيد", "السيده", "الدكتور", "الدكتوره"].map(normalize));

const ARABIC_PREFIX = /^(?:وبال|بال|وال|لل|ال|و|ب|ل)/;
const bare = (w: string) => {
  const n = normalize(w);
  return /[؀-ۿ]/.test(n) && n.length > 4 ? n.replace(ARABIC_PREFIX, "") : n;
};

export function buildNameDictionary(sources: string[], extraCommon: string[] = [], corpus: string[] = []) {
  const extra = new Set(extraCommon.flatMap((s) => tokens(s, true)));
  // "Names of people who supported you" is often answered with whole sentences. A word only counts as a name when
  // it is not used as an ordinary word elsewhere: Latin words must be capitalised in the name answers and never
  // written in lower case in any answer; Arabic words must not appear in the general comments (corpus).
  const lowerLatin = new Set<string>();
  const corpusArabic = new Map<string, number>();
  for (const s of corpus)
    for (const raw of s.split(/[^\p{L}\p{M}]+/u)) {
      if (!raw) continue;
      if (/^[a-z]/.test(raw)) lowerLatin.add(raw.toLowerCase());
      else if (/[؀-ۿ]/.test(raw)) {
        const b = bare(raw);
        corpusArabic.set(b, (corpusArabic.get(b) ?? 0) + 1);
      }
    }
  const dict = new Set<string>();
  for (const s of sources)
    for (const raw of s.split(/[^\p{L}\p{M}]+/u)) {
      const w = normalize(raw);
      if (w.length < 3 || COMMON.has(w) || extra.has(w)) continue;
      if (/[؀-ۿ]/.test(raw)) {
        if (corpusArabic.has(bare(raw)) && !ARABIC_NAMES.has(bare(raw))) continue;
      } else if (!/^[A-Z]/.test(raw) || lowerLatin.has(w) || COMMON_EN.has(w)) continue;
      dict.add(w);
      dict.add(bare(w));
    }
  return dict;
}

/** Common Arabic given names that are not also everyday words (e.g. علي/على, سعيد, حسن are left out). */
const ARABIC_NAMES = new Set(
  "محمد احمد عبدالله عبدالرحمن عبدالعزيز عبدالناصر عبدالملك عبدالحكيم ابراهيم يوسف سالم سليمان حمد حمود خلفان ناصر سيف مسلم هلال راشد سلطان مبارك عيسي موسي ماجد طلال حسين بدر فيصل ياسر طارق وليد منصور خميس زايد مازن هيثم عمار اسامه انور فاطمه مريم عايشه زينب شيخه ريم اسماء خديجه بثينه"
    .split(" ")
    .map((w) => bare(w)),
);

/** Capitalised English words that are rarely names (start of a sentence etc.). */
const COMMON_EN = new Set(
  "all thanks thank everyone team teams the they their them this that there these those both every most many some our we you your he she his her him who whom which what when where why how and also very much more most best great good excellent special mr mrs ms eng engineer engineers dr sir madam manager supervisor management omantel huawei oms nfo noc operation operations facility facilities network fiber fibre power transmission mobile core it hr cdp cdpt ojt agiops support helped help team's members member staff colleagues colleague no none nothing not yes na nil department section unit group area region muscat oman sohar salalah nizwa sur ibri buraimi".split(" "),
);

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
      if (n.length >= 3 && (dict.has(n) || dict.has(bare(part)) || ARABIC_NAMES.has(bare(part)) || /^عبد\S{3,}$/.test(n))) return label + trail;
      return part;
    })
    .join("")
    .replace(/(\[(?:اسم|name)\])(\s+\1)+/g, "$1");
}
