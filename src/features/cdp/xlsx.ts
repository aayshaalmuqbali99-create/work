import { unzipSync } from "fflate";

/**
 * Minimal, dependency-light .xlsx reader: returns the cell texts of one worksheet.
 * Only what the survey import needs (shared strings, inline strings, numbers, booleans).
 * Size-limited to guard against zip bombs.
 */

export class XlsxError extends Error {
  constructor(public code: "NOT_XLSX" | "NO_SHEET" | "TOO_LARGE", public detail?: string) {
    super(code);
  }
}

const MAX_UNCOMPRESSED = 60 * 1024 * 1024;

const decodeXml = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    // Excel escapes control characters as _xHHHH_ (e.g. _x000D_ for a carriage return)
    .replace(/_x([0-9a-f]{4})_/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

/** Concatenate every <t> run, skipping phonetic hints (<rPh>). */
function textRuns(xml: string) {
  const clean = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  let out = "";
  for (const m of clean.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)) out += m[1] ? decodeXml(m[1]) : "";
  return out;
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/** "A" → 0, "AQ" → 42 */
export function colIndex(letters: string) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
/** 0 → "A", 42 → "AQ" */
export function colLetter(index: number) {
  let s = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export type Sheet = { name: string; sheetNames: string[]; rows: string[][] };

/**
 * Read the worksheet called `preferred` (falls back to the first sheet when it does not exist).
 * Rows are dense arrays indexed by column (A = 0); missing cells are "".
 */
export function readSheet(data: Uint8Array, preferred: string): Sheet {
  let files: Record<string, Uint8Array>;
  let total = 0;
  try {
    files = unzipSync(data, {
      filter: (f) => {
        total += f.originalSize;
        if (total > MAX_UNCOMPRESSED) throw new XlsxError("TOO_LARGE");
        return f.name === "xl/workbook.xml" || f.name === "xl/_rels/workbook.xml.rels" || f.name === "xl/sharedStrings.xml" || f.name.startsWith("xl/worksheets/");
      },
    });
  } catch (e) {
    if (e instanceof XlsxError) throw e;
    throw new XlsxError("NOT_XLSX");
  }
  const td = new TextDecoder("utf-8");
  const read = (name: string) => (files[name] ? td.decode(files[name]) : null);
  const workbook = read("xl/workbook.xml");
  const rels = read("xl/_rels/workbook.xml.rels");
  if (!workbook || !rels) throw new XlsxError("NOT_XLSX");

  const relTargets = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], "Id");
    const target = attr(m[0], "Target");
    if (id && target) relTargets.set(id, target.replace(/^\/?(xl\/)?/, "xl/"));
  }
  const sheets = [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((m) => ({
    name: decodeXml(attr(m[0], "name") ?? ""),
    rid: attr(m[0], "r:id") ?? "",
  }));
  if (!sheets.length) throw new XlsxError("NO_SHEET");
  const chosen = sheets.find((s) => s.name.trim().toLowerCase() === preferred.toLowerCase()) ?? sheets[0];
  const sheetXml = read(relTargets.get(chosen.rid) ?? "");
  if (!sheetXml) throw new XlsxError("NO_SHEET", chosen.name);

  const shared: string[] = [];
  const sst = read("xl/sharedStrings.xml");
  if (sst) for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g)) shared.push(m[1] ? textRuns(m[1]) : "");

  const rows: string[][] = [];
  let lastRow = 0;
  for (const rm of sheetXml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g)) {
    const rowAttrs = rm[1] ?? rm[3] ?? "";
    const rNum = Number(attr(` ${rowAttrs}`, "r")) || lastRow + 1;
    lastRow = rNum;
    const row: string[] = [];
    let nextCol = 0;
    for (const cm of (rm[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const a = ` ${cm[1]}`;
      const ref = attr(a, "r");
      const col = ref ? colIndex(ref.replace(/\d+/g, "")) : nextCol;
      nextCol = col + 1;
      const type = attr(a, "t");
      const inner = cm[2] ?? "";
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let text = "";
      if (type === "s") text = v !== undefined ? (shared[Number(v)] ?? "") : "";
      else if (type === "inlineStr") text = textRuns(inner.match(/<is>([\s\S]*?)<\/is>/)?.[1] ?? "");
      else if (type === "b") text = v === "1" ? "TRUE" : v === "0" ? "FALSE" : "";
      else text = v !== undefined ? decodeXml(v) : "";
      while (row.length < col) row.push("");
      row[col] = text;
    }
    rows[rNum - 1] = row;
  }
  for (let i = 0; i < rows.length; i++) rows[i] ??= [];
  return { name: chosen.name, sheetNames: sheets.map((s) => s.name), rows };
}
