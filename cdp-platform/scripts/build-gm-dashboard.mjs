// Builds the General Manager dashboard (single self-contained HTML file) from the survey workbook.
//   node scripts/build-gm-dashboard.mjs path/to/responses.xlsx --excluded 1 [--names corrections.json] [--out dist/cdp-2026-gm-dashboard.html]
// Every number on the page comes from one data model computed here from the workbook: aggregated counts, plus the
// names participants thanked for supporting their training (no respondent names, comments or individual responses). --excluded is the number of test submissions removed from the file
// (it only feeds the footer sentence).
import { build } from "esbuild";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const xlsx = args.find((a) => !a.startsWith("--") && /\.xlsx$/i.test(a));
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
if (!xlsx) {
  console.error("Usage: node scripts/build-gm-dashboard.mjs responses.xlsx --excluded 1");
  process.exit(1);
}
const excluded = Number(opt("excluded", "1"));
const out = path.resolve(opt("out", path.join(root, "dist/cdp-2026-gm-dashboard.html")));

const code = (await build({
  entryPoints: [path.join(root, "gm/data-entry.ts")],
  bundle: true, format: "iife", platform: "browser", target: "es2020", write: false, legalComments: "none",
  alias: { "node:crypto": path.join(root, "html/crypto-shim.ts") },
})).outputFiles[0].text;
const sandbox = { TextDecoder, Uint8Array, Intl, Date, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const data = JSON.parse(JSON.stringify(sandbox.GM_DATA(new Uint8Array(readFileSync(xlsx)), path.basename(xlsx), excluded)));

// Optional name corrections for the recognition list (kept outside the repository: it contains names).
//   --names corrections.json   { "merge": { "Aaisha": "Aisha almaqbali" }, "rename": { "Azib": "Azib (Huawei OMS)" }, "hide": ["Ibrahim"] }
// "merge" joins the first entry into the second; a participant who wrote both spellings is counted once.
const namesFile = opt("names", null);
if (namesFile) {
  const fix = JSON.parse(readFileSync(namesFile, "utf8"));
  const list = data.recognition.people;
  const find = (n) => list.find((p) => p.name.trim().toLowerCase() === String(n).trim().toLowerCase());
  for (const [from, to] of Object.entries(fix.merge ?? {})) {
    const a = find(from), b = find(to);
    if (!a || !b) { console.warn(`  name merge skipped (not found): ${from} → ${to}`); continue; }
    b.rows = [...new Set([...(b.rows ?? []), ...(a.rows ?? [])])];
    b.count = b.rows.length;
    list.splice(list.indexOf(a), 1);
  }
  for (const [from, to] of Object.entries(fix.rename ?? {})) { const a = find(from); if (a) a.name = to; else console.warn(`  rename skipped: ${from}`); }
  for (const n of fix.hide ?? []) { const a = find(n); if (a) list.splice(list.indexOf(a), 1); else console.warn(`  hide skipped: ${n}`); }
  list.sort((x, y) => y.count - x.count || x.name.localeCompare(y.name));
  console.log(`Name corrections applied from ${path.basename(namesFile)}`);
}

// Row numbers were only needed to merge without double counting: never written to the page.
for (const p of data.recognition.people) delete p.rows;

// Integrity checks: departments and every programme row must add up to the number of responses.
const N = data.source.responses;
const deptSum = data.departments.reduce((s, d) => s + d.count, 0);
const rows = data.programmes.map((p) => ({ title: p.title, total: p.satisfaction.y + p.satisfaction.p + p.satisfaction.n }));
console.log(`Responses: ${N} · departments total ${deptSum}`);
for (const r of rows) console.log(`  ${r.title}: ${r.total}`);
if (deptSum !== N || rows.some((r) => r.total !== N)) {
  console.error("Totals do not match the number of responses — not writing the dashboard.");
  process.exit(1);
}

const logoFile = path.join(root, "public/brand/omantel-logo.png");
let logo = null;
try {
  statSync(logoFile);
  logo = "data:image/png;base64," + readFileSync(logoFile).toString("base64");
} catch {
  /* keep the logo position reserved */
}
const html = readFileSync(path.join(root, "gm/template.html"), "utf8")
  .replace("/*DATA*/null", JSON.stringify(data).replace(/</g, "\\u003c"))
  .replace("/*LOGO*/null", JSON.stringify(logo));
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(path.relative(process.cwd(), out));
