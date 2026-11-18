/**
 * Single-file HTML version of the CDP results platform (no server, no database).
 *  - upload page: choose the Excel file; it is read and calculated in the browser and never leaves the device.
 *  - report page: the same view with a management-level snapshot built in (window.__CDP_VIEW__).
 */
import ar from "../src/messages/ar.json";
import en from "../src/messages/en.json";
import { QUESTIONS, SATISFACTION_QUESTIONS, TABS, THEMES, type QuestionDef, type TabId } from "../src/features/cdp/config";
import { importWorkbook, ImportError, type Counts } from "../src/features/cdp/parse";
import { XlsxError } from "../src/features/cdp/xlsx";
import { buildView, type HtmlView } from "./view";

type Lang = "ar" | "en";
const CDP = { ar: ar.Cdp as Record<string, string>, en: en.Cdp as Record<string, string> };
const EXTRA: Record<Lang, Record<string, string>> = {
  ar: {
    uploadTitle: "اختر ملف Excel للردود",
    uploadHelp: "يُقرأ الملف داخل هذا المتصفح فقط ولا يُرسل إلى أي مكان. ملف xlsx، ورقة Sheet1.",
    choose: "اختيار ملف",
    reading: "جارٍ قراءة الملف…",
    otherFile: "ملف آخر",
    print: "طباعة / حفظ PDF",
    reportBadge: "تقرير للإدارة — نتائج مجمّعة دون أسماء",
    localBadge: "النتائج محسوبة من الملف على هذا الجهاز",
    errorsBlock: "لا يمكن عرض النتائج: ",
    warnings: "تنبيهات الملف",
    namesTitle: "الأشخاص الذين ساعدوا الفريق",
    lang: "English",
  },
  en: {
    uploadTitle: "Choose the responses Excel file",
    uploadHelp: "The file is read inside this browser only and is not sent anywhere. Sheet1, .xlsx file.",
    choose: "Choose file",
    reading: "Reading the file…",
    otherFile: "Another file",
    print: "Print / save as PDF",
    reportBadge: "Management report — aggregated results, no names",
    localBadge: "Results calculated from the file on this device",
    errorsBlock: "Results cannot be shown: ",
    warnings: "File warnings",
    namesTitle: "People who helped the team",
    lang: "العربية",
  },
};

const S = {
  lang: (localStorage.getItem("cdp-lang") as Lang) || "ar",
  view: (window as unknown as { __CDP_VIEW__?: HtmlView }).__CDP_VIEW__ ?? null,
  dept: null as number | null,
  tab: "general" as TabId,
  present: false,
  original: false,
  query: {} as Record<string, string>,
  theme: {} as Record<string, string | null>,
  limit: {} as Record<string, number>,
  busy: false,
  error: "",
};
const isReport = !!S.view;

// ── helpers ───────────────────────────────────────────────────────────────────────
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
function t(key: string, params: Record<string, string | number> = {}) {
  const s = EXTRA[S.lang][key] ?? CDP[S.lang][key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ""));
}
const tag = () => (S.lang === "ar" ? "ar-OM-u-nu-latn" : "en-GB");
const int = (n: number) => new Intl.NumberFormat(tag()).format(n);
const pct = (part: number, whole: number) =>
  whole > 0 ? `${new Intl.NumberFormat(tag(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.round((part / whole) * 1000) / 10)}%` : "—";
const date = (iso: string) => new Intl.DateTimeFormat(tag(), { dateStyle: "long", timeStyle: "short" }).format(new Date(iso));
const valid = (c: Counts) => c.y + c.p + c.n;
const L = (x: { ar: string; en: string }) => (S.lang === "ar" ? x.ar : x.en);
const COLORS = { rating: { y: "var(--yes)", p: "var(--partly)", n: "var(--no)" }, challenge: { y: "var(--ch-yes)", p: "var(--ch-partly)", n: "var(--ch-no)" } };
const ORDER = ["y", "p", "n"] as const;
const label = (q: QuestionDef, k: "y" | "p" | "n") => t(q.kind === "challenge" ? `challenge_${k}` : `answer_${k}`);
const headerText = (q: QuestionDef) => {
  const h = S.view!.questions[q.id]?.header;
  return h ? h.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n") : L(q);
};

// ── pieces ────────────────────────────────────────────────────────────────────────
function bar(c: Counts, q: QuestionDef, big = false) {
  const total = valid(c);
  const col = q.kind === "challenge" ? COLORS.challenge : COLORS.rating;
  return `<div class="bar${big ? " big" : ""}" aria-hidden="true">${ORDER.map((k) => (c[k] ? `<span style="width:${(c[k] / total) * 100}%;background:${col[k]}" title="${pct(c[k], total)}"></span>` : "")).join("")}</div>`;
}
function choices(c: Counts, q: QuestionDef) {
  const total = valid(c);
  const col = q.kind === "challenge" ? COLORS.challenge : COLORS.rating;
  return `<dl class="choices">${ORDER.map((k) => `<div><dt><i style="background:${col[k]}"></i>${esc(label(q, k))}</dt><dd><b>${pct(c[k], total)}</b> <small>(${int(c[k])})</small></dd></div>`).join("")}</dl>`;
}
function questionCard(q: QuestionDef, counts: Record<string, Counts>) {
  const v = S.view!;
  const c = counts[q.id];
  const sat = q.kind === "satisfaction";
  let body: string;
  if (v.missing.includes(q.id)) body = `<p class="note warn">${esc(t("missingColumn"))}</p>`;
  else if (!c || !valid(c)) body = `<p class="note">${esc(t("noAnswers"))}</p>`;
  else
    body = `${bar(c, q, sat)}${choices(c, q)}<p class="meta">${esc(t("validAnswers", { n: int(valid(c)) }))}${c.blank ? ` · ${esc(t("blankAnswers", { n: int(c.blank) }))}` : ""}${c.invalid ? ` · ${esc(t("invalidAnswers", { n: int(c.invalid) }))}` : ""}</p>`;
  return `<article class="card q${sat ? " sat" : ""}" id="q-${q.id}">
    <div class="chips">${sat ? `<span class="chip solid">${esc(t("satisfactionBadge"))}</span>` : ""}${q.kind === "challenge" ? `<span class="chip warn">⚠ ${esc(t("challengeBadge"))}</span>` : ""}<span class="chip mono">${q.id}</span></div>
    <h3 dir="auto">${esc(headerText(q))}</h3>${q.kind === "challenge" ? `<p class="muted small">${esc(t("challengeNote"))}</p>` : ""}${body}</article>`;
}
function themeLabel(id: string) {
  const th = THEMES.find((x) => x.id === id);
  return th ? L(th) : id;
}
function inScope(q: string) {
  return S.view!.comments.filter((c) => c.q === q && (S.dept === null || c.d === S.dept));
}
function commentList(q: QuestionDef) {
  const all = inScope(q.id);
  const query = (S.query[q.id] ?? "").trim().toLowerCase();
  const th = S.theme[q.id] ?? null;
  const shown = all.filter((c) => (!th || c.themes.includes(th)) && (!query || (S.original && c.raw ? c.raw : c.text).toLowerCase().includes(query)));
  const limit = S.limit[q.id] ?? 8;
  const deptName = (d: number) => (d >= 0 ? S.view!.departments[d]?.name : t("deptHidden"));
  return `${shown
    .slice(0, limit)
    .map(
      (c) => `<li><p dir="auto">${esc(S.original && c.raw ? c.raw : c.text)}</p><div class="chips"><span class="chip">${esc(deptName(c.d))}</span>${c.themes.map((x) => `<span class="chip tint">${esc(themeLabel(x))}</span>`).join("")}</div></li>`,
    )
    .join("")}${shown.length ? "" : `<li class="muted">${esc(t("noMatches"))}</li>`}${shown.length > limit ? `<li><button class="link" data-act="more" data-q="${q.id}">${esc(t("showMore", { n: int(shown.length - limit) }))}</button></li>` : ""}`;
}
function commentsBlock(q: QuestionDef, withThemes = true) {
  const v = S.view!;
  if (v.missing.includes(q.id)) return `<section class="card" id="q-${q.id}"><h3 dir="auto">${esc(headerText(q))}</h3><p class="note warn">${esc(t("missingColumn"))}</p></section>`;
  if (q.kind === "thanks" && !v.raw)
    return `<section class="card" id="q-${q.id}"><div class="chips"><span class="chip mono">${q.id}</span></div><h3 dir="auto">${esc(headerText(q))}</h3><p class="muted">🔒 ${esc(t("thanksRestricted", { n: int(v.thanksCounts[q.id] ?? 0) }))}</p></section>`;
  const all = inScope(q.id);
  const counts = new Map<string, number>();
  for (const c of all) for (const x of c.themes) counts.set(x, (counts.get(x) ?? 0) + 1);
  const themes = THEMES.map((x) => ({ ...x, n: counts.get(x.id) ?? 0 })).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...themes.map((x) => x.n));
  const classified = all.filter((c) => c.themes.length).length;
  const ph = v.placeholders[q.id] ?? 0;
  return `<section class="card" id="q-${q.id}">
    <div class="chips"><span class="chip tint">💬 ${esc(t("openAnswer"))}</span><span class="chip mono">${q.id}</span></div>
    <h3 dir="auto">${esc(headerText(q))}</h3>
    <p class="muted"><b class="num">${int(all.length)}</b> ${esc(t("commentsCount"))}${ph && S.dept === null ? ` · ${esc(t("placeholders", { n: int(ph) }))}` : ""}</p>
    ${
      withThemes && all.length
        ? `<h4>${esc(t("themesTitle"))}</h4><p class="muted small">${esc(t("themesNote", { classified: int(classified), total: int(all.length) }))}</p>
    <ul class="themes">${themes
      .map(
        (x) =>
          `<li><button data-act="theme" data-q="${q.id}" data-v="${x.id}" class="${S.theme[q.id] === x.id ? "on" : ""}" ${x.n ? "" : "disabled"}><span>${esc(L(x))}</span><span class="track"><span style="width:${(x.n / max) * 100}%"></span></span><span class="muted">${int(x.n)} (${pct(x.n, all.length)})</span></button></li>`,
      )
      .join("")}</ul>`
        : ""
    }
    ${
      all.length
        ? `<div class="tools noprint"><input type="search" data-search="${q.id}" value="${esc(S.query[q.id] ?? "")}" placeholder="${esc(t("searchPlaceholder"))}" aria-label="${esc(t("search"))}">${
            v.raw && !S.present ? `<button class="btn" data-act="original">${esc(S.original ? t("hideOriginal") : t("showOriginal"))}</button>` : ""
          }</div>${S.theme[q.id] ? `<p class="muted small noprint">${esc(t("filteredByTheme", { theme: themeLabel(S.theme[q.id]!) }))} <button class="link" data-act="theme" data-q="${q.id}" data-v="${S.theme[q.id]}">${esc(t("clear"))}</button></p>` : ""}
    <ul class="comments" id="list-${q.id}">${commentList(q)}</ul>`
        : ""
    }</section>`;
}
function people() {
  const v = S.view!;
  if (!v.people)
    return `<section class="card"><h3>${esc(t("peopleTitle"))}</h3><p class="muted">${esc(t("peopleSummary", { people: int(v.peopleSummary.people), repeated: int(v.peopleSummary.repeated) }))}</p><p class="muted">🔒 ${esc(t("peopleRestricted"))}</p></section>`;
  const list = v.people
    .map((p) => ({ ...p, n: S.dept === null ? p.mentions : (p.depts[S.dept] ?? 0) }))
    .filter((p) => p.n > 0)
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  const rep = list.filter((p) => p.n > 1);
  const once = list.filter((p) => p.n === 1);
  const max = Math.max(1, ...rep.map((p) => p.n));
  return `<section class="card"><h3>👥 ${esc(t("peopleTitle"))}</h3><p class="muted small">${esc(t("peopleNote"))}</p>
    <p>${esc(t("peopleSummary", { people: int(list.length), repeated: int(rep.length) }))}</p>
    ${rep.length ? `<h4>${esc(t("peopleRepeated"))}</h4><ol class="people">${rep
      .map(
        (p, i) =>
          `<li><span class="rank">${int(i + 1)}</span><span class="who"><b dir="auto">${esc(p.label)}</b>${p.variants.filter((x) => x !== p.label).length ? `<small dir="auto">${esc(t("peopleAlsoWritten"))}: ${esc(p.variants.filter((x) => x !== p.label).join(" · "))}</small>` : ""}</span><span class="track"><span style="width:${(p.n / max) * 100}%"></span></span><b class="nowrap">${esc(t("mentionedBy", { n: int(p.n) }))}</b></li>`,
      )
      .join("")}</ol>` : ""}
    ${once.length ? `<h4>${esc(t("peopleOnce", { n: int(once.length) }))}</h4><ul class="wall">${once.map((p) => `<li dir="auto">${esc(p.label)}</li>`).join("")}</ul>` : ""}</section>`;
}

// ── page ──────────────────────────────────────────────────────────────────────────
function uploadPanel() {
  return `<section class="card upload noprint" id="upload">
    <h2>${esc(t("uploadTitle"))}</h2><p class="muted">${esc(t("uploadHelp"))}</p>
    <label class="drop"><input type="file" accept=".xlsx" id="file" hidden><span class="btn primary">${esc(S.busy ? t("reading") : t("choose"))}</span></label>
    ${S.error ? `<p class="note err" role="alert">${esc(S.error)}</p>` : ""}</section>`;
}
function dashboard() {
  const v = S.view!;
  const counts = v.counts[S.dept === null ? "all" : String(S.dept)] ?? {};
  const inView = S.dept === null ? v.total : v.departments[S.dept].count;
  const deptName = S.dept === null ? t("allDepartments") : v.departments[S.dept].name;
  const maxDept = Math.max(1, ...v.departments.map((d) => d.count));
  const warns = v.report?.warnings ?? [];
  return `
  ${!isReport && warns.length ? `<details class="card warnbox noprint"><summary>⚠ ${esc(t("warnings"))} (${warns.length})</summary><ul>${warns.map((w) => `<li>${esc(t(`issue_${w.code}`, Object.fromEntries(Object.entries(w.params ?? {}).map(([k, x]) => [k, String(x)]))))}</li>`).join("")}</ul></details>` : ""}
  ${v.missing.length ? `<p class="note warn">${esc(t("missingSummary", { list: v.missing.join(", ") }))}</p>` : ""}
  <section class="total"><h2>${esc(t("totalTitle"))} <small>| ${esc(t("totalTitleOther"))}</small></h2><p class="big-num" data-testid="total">${int(v.total)}</p><p>${esc(t("totalNote"))}</p></section>
  <section class="card"><h2>${esc(t("deptTitle"))}</h2><p class="muted">${esc(t("deptNote"))}</p>
    <ul class="depts">${v.departments
      .map(
        (d, i) =>
          `<li><button data-act="dept" data-v="${i}" class="${S.dept === i ? "on" : ""}" ${d.selectable ? "" : `disabled title="${esc(t("smallDept", { n: v.minGroup }))}"`}><span dir="auto">${esc(d.name)}${d.selectable ? "" : " 🔒"}</span><span class="track"><span style="width:${(d.count / maxDept) * 100}%"></span></span><span><b>${int(d.count)}</b> <small>(${pct(d.count, v.total)})</small></span></button></li>`,
      )
      .join("")}</ul>${v.departments.some((d) => !d.selectable) ? `<p class="muted small">${esc(t("smallDeptNote", { n: v.minGroup }))}</p>` : ""}</section>
  <div class="filter"><label for="dept">${esc(t("filterLabel"))}</label><select id="dept"><option value="">${esc(t("allDepartments"))}</option>${v.departments
    .map((d, i) => `<option value="${i}" ${S.dept === i ? "selected" : ""} ${d.selectable ? "" : "disabled"}>${esc(d.name)} (${int(d.count)})${d.selectable ? "" : ` — ${esc(t("smallDeptShort"))}`}</option>`)
    .join("")}</select><span>${esc(t("inView"))} <b data-testid="in-view">${int(inView)}</b>${S.dept !== null ? ` / ${int(v.total)}` : ""}</span>${S.dept !== null ? `<button class="link" data-act="dept" data-v="">${esc(t("resetFilter"))}</button>` : ""}</div>
  <section><h2>${esc(t("satisfactionTitle", { dept: deptName }))}</h2><div class="grid sat">${SATISFACTION_QUESTIONS.map((q) => {
    const c = counts[q.id];
    const tb = TABS.find((x) => x.id === q.tab)!;
    return `<button class="card satcard" data-act="tab" data-v="${q.tab}"><p class="accent">${esc(L(tb))}</p><p class="muted small">${esc(L(q))}</p>${c && valid(c) ? `${bar(c, q, true)}${choices(c, q)}<p class="meta">${esc(t("validAnswers", { n: int(valid(c)) }))}</p>` : `<p class="note">${esc(v.missing.includes(q.id) ? t("missingColumn") : t("noAnswers"))}</p>`}</button>`;
  }).join("")}</div></section>
  <nav class="tabs noprint" role="tablist">${TABS.map((tb, i) => `<button role="tab" aria-selected="${S.tab === tb.id}" data-act="tab" data-v="${tb.id}"><small>${i + 1}</small> ${esc(L(tb))}</button>`).join("")}</nav>
  ${TABS.map(
    (tb) => `<section class="panel" ${S.tab === tb.id ? "" : 'data-hidden="1"'}><h2 class="tabtitle">${esc(L(tb))} <small>· ${esc(deptName)} · ${esc(t("responsesN", { n: int(inView) }))}</small></h2>
    <div class="grid qs">${QUESTIONS.filter((q) => q.tab === tb.id && !q.thanks && q.kind !== "text").map((q) => questionCard(q, counts)).join("")}</div>
    ${QUESTIONS.filter((q) => q.tab === tb.id && q.kind === "text").map((q) => commentsBlock(q)).join("")}
    ${tb.id === "huawei" ? `<section class="thanks"><h2>🏅 ${esc(t("thanksTitle"))}</h2><p class="muted">${esc(t("thanksNote"))}</p>${people()}${QUESTIONS.filter((q) => q.kind === "thanks").map((q) => commentsBlock(q, false)).join("")}</section>` : ""}</section>`,
  ).join("")}
  <footer><span>${esc(t("dataUpdated"))}: <b>${esc(date(v.updated))}</b></span><span>${esc(t("sourceFile"))}: <b dir="ltr">${esc(v.fileName)}</b></span></footer>`;
}

function render() {
  const root = document.getElementById("app")!;
  document.documentElement.lang = S.lang;
  document.documentElement.dir = S.lang === "ar" ? "rtl" : "ltr";
  document.documentElement.dataset.present = S.present ? "on" : "off";
  document.title = t("metaTitle");
  root.innerHTML = `
  <header class="top"><img src="${(window as unknown as { __LOGO__: string }).__LOGO__}" alt="Omantel" class="logo"><div class="titles"><p class="eyebrow" dir="ltr">Omantel | CDP Programme Evaluation 2026</p><p>${esc(t("platformName"))}</p></div>
    <div class="actions noprint"><button class="btn" data-act="lang">${esc(t("lang"))}</button>${S.view ? `<button class="btn" data-act="present">${esc(S.present ? t("exitPresent") : t("present"))}</button><button class="btn" data-act="print">${esc(t("print"))}</button>` : ""}${S.view && !isReport ? `<button class="btn" data-act="reset">${esc(t("otherFile"))}</button>` : ""}</div></header>
  <main>
    <h1>${esc(t("pageTitle"))}</h1>
    <p class="badge">${esc(isReport ? t("reportBadge") : S.view ? t("localBadge") : t("pageIntro"))}</p>
    ${S.view ? dashboard() : uploadPanel()}
  </main>`;
}

// ── events ────────────────────────────────────────────────────────────────────────
async function load(file: File) {
  S.busy = true;
  S.error = "";
  render();
  try {
    if (!/\.xlsx$/i.test(file.name)) throw new Error(t("uploadNotXlsx"));
    const { dataset, report } = importWorkbook(new Uint8Array(await file.arrayBuffer()));
    if (report.errors.length) throw new Error(t("errorsBlock") + report.errors.map((e) => t(`issue_${e.code}`)).join(" · "));
    S.view = buildView(dataset, { management: false, fileName: file.name, updated: new Date(file.lastModified || Date.now()).toISOString(), report });
    S.dept = null;
    S.tab = "general";
  } catch (e) {
    S.error = e instanceof XlsxError ? t("uploadNotXlsx") : e instanceof ImportError ? t(`issue_${e.issue.code}`) : (e as Error).message;
  }
  S.busy = false;
  render();
}

document.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
  if (!el) return;
  const { act, v, q } = el.dataset;
  if (act === "lang") {
    S.lang = S.lang === "ar" ? "en" : "ar";
    try {
      localStorage.setItem("cdp-lang", S.lang);
    } catch {
      /* private mode */
    }
  } else if (act === "present") S.present = !S.present;
  else if (act === "print") return window.print();
  else if (act === "reset") {
    S.view = null;
    S.error = "";
  } else if (act === "dept") S.dept = v === "" || v === undefined || S.dept === Number(v) ? null : Number(v);
  else if (act === "tab") {
    S.tab = v as TabId;
    render();
    document.querySelector(".tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  } else if (act === "theme" && q) S.theme[q] = S.theme[q] === v ? null : v!;
  else if (act === "more" && q) S.limit[q] = (S.limit[q] ?? 8) + 24;
  else if (act === "original") S.original = !S.original;
  render();
});
document.addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  if (el.id === "file" && el instanceof HTMLInputElement && el.files?.[0]) load(el.files[0]);
  if (el.id === "dept") {
    S.dept = el.value === "" ? null : Number(el.value);
    render();
  }
});
document.addEventListener("input", (e) => {
  const el = e.target as HTMLInputElement;
  const q = el.dataset.search;
  if (!q) return;
  S.query[q] = el.value;
  const def = QUESTIONS.find((x) => x.id === q)!;
  const list = document.getElementById(`list-${q}`);
  if (list) list.innerHTML = commentList(def);
});
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0];
  if (f && !isReport) load(f);
});
window.addEventListener("beforeprint", () => document.documentElement.classList.add("printing"));
window.addEventListener("afterprint", () => document.documentElement.classList.remove("printing"));

render();
