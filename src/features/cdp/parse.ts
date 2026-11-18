import { createHash } from "node:crypto";
import {
  ANSWER_SYNONYMS,
  CLOSED_KINDS,
  DEPARTMENT_MATCH,
  EMPTY_TEXT,
  IDENTITY_MATCH,
  META_MATCH,
  QUESTIONS,
  REFERENCE,
  SATISFACTION_QUESTIONS,
  SHEET_NAME,
  THEMES,
  type QuestionDef,
} from "./config";
import { readSheet, colLetter, colIndex } from "./xlsx";
import { cleanDisplay, containsPhrase, normalize, tokens } from "./text";
import { buildNameDictionary, redact } from "./redact";

export type Answer = "y" | "p" | "n" | "x"; // x = a value that is not yes / partly / no
export type Counts = { y: number; p: number; n: number; blank: number; invalid: number };

export type MappedQuestion = { header: string | null; column: string | null; matchedBy: "header" | "position" | null };

export type TextAnswer = {
  id: string; // stable within the dataset
  key: string; // hash of question + normalised text: carries manual theme tags over to newer files
  q: string;
  d: number; // department index (-1 = not specified)
  raw: string; // original text — restricted
  red: string; // with identifying details removed — management view
  auto: string[]; // themes found by keywords
};

export type Issue = { code: string; params?: Record<string, string | number> };

export type ImportReport = {
  sheetName: string;
  sheetNames: string[];
  headerRow: number;
  totalRows: number;
  departmentColumn: { column: string; header: string } | null;
  errors: Issue[]; // block activation
  warnings: Issue[];
  questions: { id: string; tab: string; column: string | null; expected: string; header: string | null; matchedBy: MappedQuestion["matchedBy"] }[];
  droppedColumns: { column: string; header: string; reason: "identity" | "meta" | "unused" }[];
  unknownValues: { q: string; value: string; count: number }[];
  reference: { applicable: boolean; items: { label: string; expected: number; actual: number; ok: boolean }[] };
};

export type Dataset = {
  v: 1;
  departments: { name: string; count: number }[]; // as written in the file, most responses first
  questions: Record<string, MappedQuestion>;
  responses: { d: number; a: Record<string, Answer> }[];
  texts: TextAnswer[];
  placeholders: Record<string, number>; // "no comment" style answers per text question
};

export class ImportError extends Error {
  constructor(public issue: Issue) {
    super(issue.code);
  }
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 20);

// ── answers ─────────────────────────────────────────────────────────────────────────
export function parseAnswer(value: string): Answer | null {
  const n = normalize(value);
  if (!n) return null;
  for (const code of ["p", "y", "n"] as const) if (ANSWER_SYNONYMS[code].some((s) => containsPhrase(n, s))) return code;
  return "x";
}

const EMPTY_SET = new Set(EMPTY_TEXT.map(normalize));
export const isPlaceholder = (text: string) => EMPTY_SET.has(normalize(text));

export function detectThemes(text: string) {
  const n = normalize(text);
  return THEMES.filter((t) => t.keywords.some((k) => containsPhrase(n, k) || (normalize(k).length >= 5 && n.includes(normalize(k))))).map((t) => t.id);
}

// ── header matching ─────────────────────────────────────────────────────────────────
const THRESHOLD = 0.75;

function scoreHeader(q: QuestionDef, header: string) {
  const n = normalize(header);
  if (q.exclude?.some((x) => containsPhrase(n, x))) return 0;
  const hs = new Set(tokens(header));
  let best = 0;
  for (const phrase of q.match) {
    const nt = tokens(phrase);
    if (!nt.length) continue;
    const hit = nt.filter((t) => hs.has(t)).length;
    const score = hit / nt.length + 0.1 * (hit / Math.max(hs.size, 1));
    best = Math.max(best, score);
  }
  return best;
}

const short = (header: string, max: number) => tokens(header, true).length <= max;

export function mapColumns(headers: string[], rows: string[][]) {
  const cols = headers.map((h, i) => ({ i, h: cleanDisplay(h ?? "") })).filter((c) => c.h);
  const used = new Map<number, string>();

  // 1. Questions by header text (best overall score first; the expected column only breaks ties)
  const candidates: { q: QuestionDef; i: number; s: number }[] = [];
  for (const q of QUESTIONS)
    for (const c of cols) {
      const s = scoreHeader(q, c.h);
      if (s >= THRESHOLD) candidates.push({ q, i: c.i, s: s + (colLetter(c.i) === q.id ? 0.02 : 0) });
    }
  candidates.sort((a, b) => b.s - a.s);
  const mapped: Record<string, MappedQuestion> = {};
  for (const c of candidates) {
    if (mapped[c.q.id] || used.has(c.i)) continue;
    mapped[c.q.id] = { header: headers[c.i], column: colLetter(c.i), matchedBy: "header" };
    used.set(c.i, c.q.id);
  }

  // 2. Department column
  let dept: number | null = null;
  for (const c of cols) {
    if (used.has(c.i) || !short(c.h, 14)) continue;
    const n = normalize(c.h);
    if (!DEPARTMENT_MATCH.some((p) => containsPhrase(n, p))) continue;
    const values = new Set(rows.map((r) => (r[c.i] ?? "").trim()).filter(Boolean));
    if (values.size >= 1 && values.size <= 40) {
      dept = c.i;
      break;
    }
  }
  if (dept !== null) used.set(dept, "department");

  // 3. Identity and form metadata columns (never stored)
  const identity: number[] = [];
  const dropped: ImportReport["droppedColumns"] = [];
  for (const c of cols) {
    if (used.has(c.i)) continue;
    const n = normalize(c.h);
    if (short(c.h, 6) && IDENTITY_MATCH.some((p) => containsPhrase(n, p))) {
      identity.push(c.i);
      dropped.push({ column: colLetter(c.i), header: c.h, reason: "identity" });
      used.set(c.i, "identity");
    } else if (short(c.h, 4) && META_MATCH.some((p) => n === normalize(p) || containsPhrase(n, p))) {
      dropped.push({ column: colLetter(c.i), header: c.h, reason: "meta" });
      used.set(c.i, "meta");
    }
  }

  // 4. Fallback: expected column letter, only when the file keeps the reference layout and the values fit.
  const byHeader = Object.entries(mapped);
  const sameLayout = byHeader.length >= 10 && byHeader.filter(([id, m]) => m.column === id).length / byHeader.length >= 0.8;
  for (const q of QUESTIONS) {
    if (mapped[q.id] || !sameLayout) continue;
    const i = colIndex(q.id);
    if (used.has(i) || !(headers[i] ?? "").trim()) continue;
    if (CLOSED_KINDS.includes(q.kind)) {
      const vals = rows.map((r) => r[i] ?? "").filter((v) => v.trim());
      const ok = vals.filter((v) => parseAnswer(v) !== "x").length;
      if (!vals.length || ok / vals.length < 0.8) continue;
    }
    mapped[q.id] = { header: headers[i], column: q.id, matchedBy: "position" };
    used.set(i, q.id);
  }

  for (const c of cols) if (!used.has(c.i)) dropped.push({ column: colLetter(c.i), header: c.h, reason: "unused" });
  for (const q of QUESTIONS) mapped[q.id] ??= { header: null, column: null, matchedBy: null };
  return { mapped, dept, identity, dropped };
}

// ── import ──────────────────────────────────────────────────────────────────────────
export function importWorkbook(data: Uint8Array): { dataset: Dataset; report: ImportReport } {
  const sheet = readSheet(data, SHEET_NAME);
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  if (sheet.name.toLowerCase() !== SHEET_NAME.toLowerCase()) warnings.push({ code: "sheetFallback", params: { sheet: sheet.name } });

  // Header row = first row with at least 5 non-empty cells (normally row 1).
  const headerIdx = sheet.rows.findIndex((r) => r.filter((c) => c.trim()).length >= 5);
  if (headerIdx < 0) throw new ImportError({ code: "noHeader" });
  const headers = sheet.rows[headerIdx];
  const body = sheet.rows.slice(headerIdx + 1).filter((r) => r.some((c) => c.trim()));
  if (!body.length) errors.push({ code: "noRows" });

  const { mapped, dept, identity, dropped } = mapColumns(headers, body);
  if (dept === null) errors.push({ code: "noDepartment" });

  // Department buckets, most responses first; names exactly as in the file (spaces cleaned)
  const deptName = (r: string[]) => (dept === null ? "" : cleanDisplay(r[dept] ?? "").replace(/\n/g, " "));
  const deptCounts = new Map<string, number>();
  for (const r of body) deptCounts.set(deptName(r), (deptCounts.get(deptName(r)) ?? 0) + 1);
  const departments = [...deptCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const deptIndex = new Map(departments.map((d, i) => [d.name, i]));
  if (deptCounts.has("")) warnings.push({ code: "blankDepartment", params: { count: deptCounts.get("")! } });

  // Names used ONLY to remove identifying details from comments; never stored.
  const auCol = mapped.AU?.column ? colIndex(mapped.AU.column) : null;
  const nameSources: string[] = [];
  for (const r of body) {
    for (const i of identity) nameSources.push(r[i] ?? "");
    if (auCol !== null) nameSources.push(r[auCol] ?? "");
  }
  const dict = buildNameDictionary(nameSources, departments.map((d) => d.name));

  const unknown = new Map<string, number>();
  const responses: Dataset["responses"] = [];
  const texts: TextAnswer[] = [];
  const placeholders: Record<string, number> = {};
  body.forEach((r, rowNo) => {
    const d = deptIndex.get(deptName(r)) ?? -1;
    const a: Record<string, Answer> = {};
    for (const q of QUESTIONS) {
      const col = mapped[q.id].column;
      if (!col) continue;
      const raw = r[colIndex(col)] ?? "";
      if (!raw.trim()) continue;
      if (CLOSED_KINDS.includes(q.kind)) {
        const ans = parseAnswer(raw)!;
        a[q.id] = ans;
        if (ans === "x") {
          const k = `${q.id}\u0000${cleanDisplay(raw).slice(0, 80)}`;
          unknown.set(k, (unknown.get(k) ?? 0) + 1);
        }
      } else {
        const text = cleanDisplay(raw);
        if (q.kind !== "names" && isPlaceholder(text)) {
          placeholders[q.id] = (placeholders[q.id] ?? 0) + 1;
          continue;
        }
        texts.push({
          id: `${q.id}-${rowNo + 1}`,
          key: sha(`${q.id}|${normalize(text)}`),
          q: q.id,
          d,
          raw: text,
          red: q.kind === "names" ? "" : redact(text, dict),
          auto: q.kind === "text" ? detectThemes(text) : [],
        });
      }
    }
    responses.push({ d, a });
  });

  const missing = QUESTIONS.filter((q) => !mapped[q.id].column);
  for (const q of missing) warnings.push({ code: "missingColumn", params: { id: q.id, text: q.en } });
  for (const q of QUESTIONS) if (mapped[q.id].matchedBy === "position") warnings.push({ code: "matchedByPosition", params: { id: q.id } });
  for (const q of QUESTIONS) {
    const m = mapped[q.id];
    if (m.matchedBy === "header" && m.column !== q.id) warnings.push({ code: "columnMoved", params: { id: q.id, column: m.column! } });
  }
  if (SATISFACTION_QUESTIONS.every((q) => !mapped[q.id].column)) errors.push({ code: "noSatisfaction" });
  const unknownValues = [...unknown.entries()].map(([k, count]) => {
    const [q, value] = k.split("\u0000");
    return { q, value, count };
  });
  if (unknownValues.length) warnings.push({ code: "unknownValues", params: { count: unknownValues.reduce((s, u) => s + u.count, 0) } });

  const dataset: Dataset = { v: 1, departments, questions: mapped, responses, texts, placeholders };
  const report: ImportReport = {
    sheetName: sheet.name,
    sheetNames: sheet.sheetNames,
    headerRow: headerIdx + 1,
    totalRows: body.length,
    departmentColumn: dept === null ? null : { column: colLetter(dept), header: cleanDisplay(headers[dept]) },
    errors,
    warnings,
    questions: QUESTIONS.map((q) => ({ id: q.id, tab: q.tab, expected: q.id, column: mapped[q.id].column, header: mapped[q.id].header ? cleanDisplay(mapped[q.id].header!) : null, matchedBy: mapped[q.id].matchedBy })),
    droppedColumns: dropped,
    unknownValues,
    reference: referenceCheck(dataset),
  };
  return { dataset, report };
}

// ── aggregation ─────────────────────────────────────────────────────────────────────
export const emptyCounts = (): Counts => ({ y: 0, p: 0, n: 0, blank: 0, invalid: 0 });

/** Counts per closed question for the given departments (null = all responses). */
export function aggregate(ds: Dataset, depts: number[] | null) {
  const out: Record<string, Counts> = {};
  const qs = QUESTIONS.filter((q) => CLOSED_KINDS.includes(q.kind) && ds.questions[q.id]?.column);
  for (const q of qs) out[q.id] = emptyCounts();
  for (const r of ds.responses) {
    if (depts && !depts.includes(r.d)) continue;
    for (const q of qs) {
      const a = r.a[q.id];
      const c = out[q.id];
      if (!a) c.blank++;
      else if (a === "x") c.invalid++;
      else c[a]++;
    }
  }
  return out;
}

export function referenceCheck(ds: Dataset): ImportReport["reference"] {
  const items: ImportReport["reference"]["items"] = [];
  const total = ds.responses.length;
  items.push({ label: "total", expected: REFERENCE.total, actual: total, ok: total === REFERENCE.total });
  for (const [name, expected] of Object.entries(REFERENCE.departments)) {
    const actual = ds.departments.find((d) => normalize(d.name) === normalize(name))?.count ?? 0;
    items.push({ label: `dept:${name}`, expected, actual, ok: actual === expected });
  }
  const all = aggregate(ds, null);
  for (const [q, exp] of Object.entries(REFERENCE.satisfaction))
    for (const k of ["y", "p", "n"] as const) {
      const actual = all[q]?.[k] ?? 0;
      items.push({ label: `${q}:${k}`, expected: exp[k], actual, ok: actual === exp[k] });
    }
  return { applicable: total === REFERENCE.total, items };
}
