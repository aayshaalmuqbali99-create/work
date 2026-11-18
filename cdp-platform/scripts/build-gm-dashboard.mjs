// Builds the General Manager dashboard (single self-contained HTML file) from the survey workbook.
//   node scripts/build-gm-dashboard.mjs path/to/responses.xlsx --excluded 1 [--out dist/cdp-2026-gm-dashboard.html]
// Every number on the page comes from one data model computed here from the workbook (aggregated counts only:
// no names, comments or individual responses). --excluded is the number of test submissions removed from the file
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
