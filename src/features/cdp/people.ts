import { normalize } from "./text";

/**
 * "People who supported you" (AU): pull individual names out of free-text answers and group spellings of the
 * same person, across Arabic and Latin script (e.g. "Azib" / "عازب", "Ibrahim AlMamari" / "ابراهيم المعمري").
 * Grouping uses a consonant skeleton; anything it cannot join can be merged, renamed or hidden by authorised
 * users (SurveyNameRule, stored in the database). Counts are the number of DIFFERENT respondents who named the person.
 */

export type Person = {
  key: string;
  label: string;
  variants: { text: string; count: number }[];
  mentions: number; // distinct respondents
  depts: Record<number, number>;
};

const ARABIC = /[؀-ۿ]/;

const AR_MAP: Record<string, string> = {
  ب: "b", ت: "t", ث: "t", ج: "j", ح: "h", خ: "k", د: "d", ذ: "d", ر: "r", ز: "z", س: "s", ش: "s", ص: "s", ض: "d", ط: "t", ظ: "z",
  غ: "g", ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n", ه: "h", گ: "g", پ: "b", چ: "s", ڤ: "f",
};

/** Consonant skeleton shared by Arabic and Latin spellings. */
export function skeleton(word: string) {
  const w = normalize(word);
  if (ARABIC.test(w)) {
    let out = "";
    for (const ch of w.replace(/ه$/, "")) out += AR_MAP[ch] ?? ""; // vowels, hamza, ain and final ta marbuta dropped
    return out;
  }
  return w
    .replace(/[^a-z]/g, "")
    .replace(/sh|ch/g, "s")
    .replace(/th/g, "t")
    .replace(/ph|v/g, "f")
    .replace(/kh/g, "k")
    .replace(/gh/g, "g")
    .replace(/dh/g, "d")
    .replace(/bh/g, "b")
    .replace(/p/g, "b")
    .replace(/x/g, "ks")
    .replace(/c/g, "k")
    .replace(/([aeiou])h$/, "$1")
    .replace(/(.)\1+/g, "$1") // doubled letters (Mammari = Mamari), before vowels are removed
    .replace(/[aeiouyw]/g, "");
}

const FIRST_NAME_ALIASES: Record<string, string> = { mhd: "mhmd", mhmmd: "mhmd" };

const FILLER = new Set(
  [
    "mr", "mrs", "ms", "miss", "eng", "en", "engr", "engineer", "engineering", "dr", "tl", "ot", "oms", "huawei", "huwai", "omantel", "from",
    "team", "leader", "leaders", "region", "regional", "area", "manager", "managers", "mangers", "my", "our", "the", "of", "to", "for", "thanks",
    "thank", "in", "at", "zone", "nfo", "fo", "tk", "msp", "om", "sohar", "musandam", "muscat", "ibra",
    "من", "شركه", "هواوي", "هواووي", "عمانتل", "رئيس", "الفريق", "فريق", "المهندس", "المهندسه", "مهندس", "الاخ", "الاخت", "الاستاذ", "السيد",
    "مدير", "المدير", "في", "صحار", "مسندم", "مسقط",
  ].map(normalize),
);
const NOT_NAME = new Set(
  [
    "all", "nobody", "body", "no", "na", "nil", "none", "yes", "tanks", "everyone", "colleague", "colleagues", "employees", "practical",
    "training", "courses", "support", "supported", "fiber", "satellite", "power", "vsat", "tx", "team", "different", "fields", "so", "more",
    "also", "however", "appreciation", "everything", "nothing", "anyone", "everybody", "i", "we", "he", "she", "they", "his", "her",
    "الكل", "كل", "لا", "يوجد", "احد", "واحد", "شخص", "كفريق", "اعرف", "بدون", "استثناء", "موظفي", "القسم", "متعاون", "متعاونين", "الزملاء", "زملائي", "بالكامل", "كلنا", "اسم", "يحضرني",
  ].map(normalize),
);

const isFiller = (w: string) => {
  const n = normalize(w);
  return FILLER.has(n) || (ARABIC.test(n) && n.length > 3 && FILLER.has(n.replace(/^و/, "")));
};

/** Split one answer into candidate names. */
export function extractNames(answer: string): string[] {
  const text = answer
    // e-mail → its name part, capitalised like a written name
    .replace(/([\w.+-]+)@[\w-]+(\.[\w-]+)+/g, (_, local: string) => local.split(/[._]/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" "))
    .replace(/\(([^)]*)\)/g, ", $1, ");
  const chunks = text
    .split(/\n|[,،؛;&/:|+()[\]]|\s+-\s+|\.(?=\s|[A-Za-z؀-ۿ]|$)|(?<=\s)-(?=\S)|(?<=[a-z؀-ۿ])-(?=\s)/i)
    .map((c) => c.replace(/^\s*\d+\s*[-.)]?\s*/, "").trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const chunk of chunks) {
    if (chunk.split(/\s+/).filter((w) => !isFiller(w)).length > 5) {
      // A sentence: keep capitalised Latin word runs only ("… our Area Manager, Ali Al Alawi, for …").
      for (const m of chunk.matchAll(/\b[A-Z][A-Za-z']+(?:[\s-][A-Z][A-Za-z']+)*/g)) {
        const kept = m[0].split(/[\s-]+/).filter((w) => !isFiller(w) && !NOT_NAME.has(normalize(w)));
        if (kept.length && kept.length <= 4 && kept.join("").length >= 3) out.push(kept.join(" "));
      }
      continue;
    }
    // A chunk that says "everyone", "no one", … is not a list of names.
    if (chunk.split(/\s+/).some((w) => NOT_NAME.has(normalize(w)) || (ARABIC.test(w) && NOT_NAME.has(normalize(w).replace(/^و/, ""))))) continue;
    for (const part of chunk.split(/\s(?:and|و)\s|\s+و(?=[؀-ۿ]{3,})/i)) {
      const kept = part
        .trim()
        .split(/\s+/)
        .filter((w) => w && !isFiller(w) && !/^[A-Z]{2,3}$/.test(w));
      if (!kept.length || kept.length > 4) continue;
      if (kept.some((w) => NOT_NAME.has(normalize(w)) || /\d/.test(w))) continue;
      if (kept.join("").length < 3) continue;
      // Latin names are written with a capital letter; lower-case runs are ordinary words.
      if (/^[A-Za-z]/.test(kept[0]) && !/^[A-Z]/.test(kept[0])) continue;
      out.push(kept.join(" "));
    }
  }
  return out;
}

const stripAl = (w: string) => w.replace(/^(al-?|el-?|ال)(?=\S{3,})/i, "");

/** Key: first-name skeleton + surname skeleton ("" when only one word). */
function keyOf(name: string) {
  const words = name.split(/[\s-]+/).filter(Boolean);
  // "Abd Rahman", "عبد الناصر" → one first name
  const merged: string[] = [];
  for (const w of words) {
    const prev = merged[merged.length - 1];
    if (prev && /^(abd|abdul|abdel|عبد)$/i.test(normalize(prev))) merged[merged.length - 1] = prev + w;
    else merged.push(w);
  }
  let first = skeleton(merged[0] ?? "");
  first = FIRST_NAME_ALIASES[first] ?? first;
  const rest = merged.slice(1).filter((w) => w.length > 2 && !/^(al|el|ال|bin|bint|بن|بنت)$/i.test(normalize(w)));
  return { first, last: rest.map((w) => skeleton(stripAl(w))).join("") };
}

/** Edit distance ≤ 1, same first letter. */
function close(a: string, b: string) {
  if (a === b) return true;
  if (!a || !b || a[0] !== b[0] || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const sameFirst = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 4 && close(a, b));
/** Surnames: equal, one letter apart (only when long enough, or when the first name is distinctive), or one is the tail of the other (middle name). */
const sameLast = (a: string, b: string, first: string) =>
  a === b || (close(a, b) && (Math.min(a.length, b.length) >= 3 || first.length >= 4)) || (Math.min(a.length, b.length) >= 3 && (a.endsWith(b) || b.endsWith(a)));

export function groupPeople(answers: { row: number; d: number; text: string }[]): Person[] {
  type G = { first: string; last: string; variants: Map<string, number>; rows: Set<number>; depts: Map<number, Set<number>> };
  const groups: G[] = [];
  const newGroup = (first: string, last: string) => {
    const g: G = { first, last, variants: new Map(), rows: new Set(), depts: new Map() };
    groups.push(g);
    return g;
  };
  const pending: { first: string; name: string; row: number; d: number }[] = [];
  const add = (g: G, name: string, row: number, d: number) => {
    g.variants.set(name, (g.variants.get(name) ?? 0) + 1);
    g.rows.add(row);
    if (!g.depts.has(d)) g.depts.set(d, new Set());
    g.depts.get(d)!.add(row);
  };
  for (const a of answers)
    for (const name of extractNames(a.text)) {
      const { first, last } = keyOf(name);
      if (!first) continue;
      if (!last) pending.push({ first, name, row: a.row, d: a.d });
      else add(groups.find((x) => x.last && sameFirst(x.first, first) && sameLast(x.last, last, first)) ?? newGroup(first, last), name, a.row, a.d);
    }
  // First name only: join the full-name group when exactly one person has that first name, else keep it on its own.
  for (const p of pending) {
    const full = groups.filter((x) => x.last && sameFirst(x.first, p.first));
    add(full.length === 1 ? full[0] : (groups.find((x) => !x.last && sameFirst(x.first, p.first)) ?? newGroup(p.first, "")), p.name, p.row, p.d);
  }
  return groups
    .map((g) => {
      const variants = [...g.variants.entries()].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count || b.text.length - a.text.length);
      const fullest = [...variants].sort((a, b) => b.text.split(/\s+/).length - a.text.split(/\s+/).length || b.count - a.count)[0];
      return {
        key: `${g.first}|${g.last}`,
        label: fullest.text,
        variants,
        mentions: g.rows.size,
        depts: Object.fromEntries([...g.depts.entries()].map(([d, rows]) => [d, rows.size])),
      };
    })
    .sort((a, b) => b.mentions - a.mentions || a.label.localeCompare(b.label));
}

export type NameRule = { key: string; mergeInto: string | null; label: string | null; hidden: boolean };
export type PersonView = Person & { hidden: boolean; merged: string[] };

/** Apply authorised users' corrections: merge into another entry, rename, or hide (not a person). */
export function applyRules(people: Person[], rules: NameRule[]): PersonView[] {
  const byKey = new Map(rules.map((r) => [r.key, r]));
  const exists = new Set(people.map((p) => p.key));
  const resolve = (k: string, seen = new Set<string>()): string => {
    const r = byKey.get(k);
    if (!r?.mergeInto || seen.has(k) || !exists.has(r.mergeInto)) return k;
    seen.add(k);
    return resolve(r.mergeInto, seen);
  };
  const out = new Map<string, Person>();
  for (const p of people) {
    const target = resolve(p.key);
    const cur = out.get(target);
    if (!cur) out.set(target, { ...p, key: target, variants: [...p.variants], depts: { ...p.depts } });
    else {
      cur.mentions += p.mentions;
      cur.variants.push(...p.variants);
      for (const [d, n] of Object.entries(p.depts)) cur.depts[Number(d)] = (cur.depts[Number(d)] ?? 0) + n;
    }
  }
  return [...out.values()]
    .map((p) => {
      const r = byKey.get(p.key);
      const own = people.find((x) => x.key === p.key);
      return {
        ...p,
        label: r?.label || own?.label || p.label,
        hidden: !!r?.hidden,
        merged: people.filter((x) => x.key !== p.key && resolve(x.key) === p.key).map((x) => x.key),
      };
    })
    .sort((a, b) => b.mentions - a.mentions || a.label.localeCompare(b.label));
}
