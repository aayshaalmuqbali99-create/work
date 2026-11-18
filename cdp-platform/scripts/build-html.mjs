// Builds the single-file HTML versions of the CDP results platform.
//   node scripts/build-html.mjs                       → dist/cdp-results.html (upload page: open, choose the Excel file)
//   node scripts/build-html.mjs path/to/responses.xlsx → also dist/cdp-results-report.html (management report with the
//                                                        file's aggregated results built in; no names, no individual responses)
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist");
mkdirSync(out, { recursive: true });

const bundle = async (entry) =>
  (await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    write: false,
    alias: { "node:crypto": path.join(root, "html/crypto-shim.ts") },
    loader: { ".json": "json" },
    legalComments: "none",
  })).outputFiles[0].text;

const css = readFileSync(path.join(root, "html/styles.css"), "utf8");
const logo = "data:image/png;base64," + readFileSync(path.join(root, "public/brand/omantel-logo.png")).toString("base64");
const app = await bundle(path.join(root, "html/app.ts"));
const page = (data) => `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap">
<title>Omantel | CDP Programme Evaluation 2026</title><style>${css}</style></head>
<body><div id="app"></div><script>window.__LOGO__=${JSON.stringify(logo)};${data ? `window.__CDP_VIEW__=${JSON.stringify(data).replace(/</g, "\\u003c")};` : ""}</script><script>${app.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;

writeFileSync(path.join(out, "cdp-results.html"), page(null));
console.log("dist/cdp-results.html");

const xlsx = process.argv[2];
if (xlsx) {
  const { snapshot } = await import(path.join(root, "html/snapshot.mjs"));
  const view = await snapshot(xlsx, bundle);
  writeFileSync(path.join(out, "cdp-results-report.html"), page(view));
  console.log("dist/cdp-results-report.html");
}
