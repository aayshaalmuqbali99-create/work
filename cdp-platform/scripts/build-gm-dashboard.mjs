// Builds the General Manager dashboard (single self-contained HTML file) from the survey workbook.
//   node scripts/build-gm-dashboard.mjs path/to/responses.xlsx --excluded 1 [--names corrections.json] [--programme gm/cdp-programme.json] [--catalogue gm/cdpt-catalogue-review.json] [--out dist/cdp-2026-gm-dashboard.html]
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

// CDP Programme (not the survey): gm/cdp-programme.json, or --programme file.json. Two independent datasets —
// domain records and FM tasks — each with its own total. Source order is kept (the page sorts by count, ties keep it).
const programmeFile = path.resolve(opt("programme", path.join(root, "gm/cdp-programme.json")));
{
  const c = JSON.parse(readFileSync(programmeFile, "utf8"));
  for (const key of ["domains", "fmTasks"]) {
    const set = c[key];
    const sum = set.items.reduce((s, d) => s + d.count, 0);
    console.log(`CDP Programme ${key}: ${sum} in ${set.items.length} categories`);
    if (set.total !== undefined && set.total !== sum) {
      console.error(`CDP Programme ${key}: categories add up to ${sum}, not the stated total ${set.total} — not writing the dashboard.`);
      process.exit(1);
    }
  }
  const meta = (x) => ({ programme: x.programme, label: x.label, labelAr: x.labelAr });
  data.programme = { domains: c.domains.items, fmTasks: c.fmTasks.items, domainsMeta: meta(c.domains), fmTasksMeta: meta(c.fmTasks) };
}

// CDP-T Training Catalogue Review (Facility Operations): gm/cdpt-catalogue-review.json, or --catalogue file.json
{
  const f = path.resolve(opt("catalogue", path.join(root, "gm/cdpt-catalogue-review.json")));
  let c = null;
  try { c = JSON.parse(readFileSync(f, "utf8")); } catch (e) { if (e.code !== "ENOENT") throw e; }
  if (c) {
    const T = c.totals, sum = c.breakdown.reduce((s, b) => s + b.count, 0);
    const problems = [];
    if (T.available + T.notFound !== T.huaweiCourses) problems.push(`available ${T.available} + not found ${T.notFound} ≠ Huawei courses ${T.huaweiCourses}`);
    if (sum !== T.huaweiCourses) problems.push(`list breakdown adds up to ${sum}, not ${T.huaweiCourses}`);
    if (T.huaweiCourses > T.totalCourses) problems.push("more Huawei courses than total courses");
    if (T.requireL1Plus > T.huaweiCourses) problems.push("L1+ courses exceed Huawei courses");
    console.log(`CDP-T catalogue review: ${T.totalCourses} courses, ${T.huaweiCourses} Huawei, ${T.available} available, ${T.notFound} not found`);
    if (problems.length) { console.error("CDP-T catalogue review: " + problems.join("; ") + " — not writing the dashboard."); process.exit(1); }
    delete c._note;
    data.catalogue = c;
  }
}

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
