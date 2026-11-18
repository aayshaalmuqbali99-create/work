import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { importWorkbook, aggregate, parseAnswer, mapColumns, detectThemes } from "../../src/features/cdp/parse";
import { QUESTIONS, REFERENCE, TABS } from "../../src/features/cdp/config";
import { buildNameDictionary, redact } from "../../src/features/cdp/redact";

const fixture = readFileSync(path.join(__dirname, "fixtures/cdp-synthetic-135.xlsx"));
const { dataset, report } = importWorkbook(new Uint8Array(fixture));

test("reads 135 responses from Sheet1 with no blocking errors", () => {
  assert.equal(report.sheetName, "Sheet1");
  assert.equal(dataset.responses.length, 135);
  assert.deepEqual(report.errors, []);
});

test("department counts match the reference", () => {
  const got = Object.fromEntries(dataset.departments.map((d) => [d.name, d.count]));
  assert.deepEqual(got, REFERENCE.departments);
});

test("every question maps by header text to its expected column", () => {
  for (const q of report.questions) {
    assert.equal(q.column, q.expected, `question ${q.id}`);
    assert.equal(q.matchedBy, "header", `question ${q.id}`);
  }
});

test("satisfaction counts match the reference", () => {
  const all = aggregate(dataset, null);
  for (const [q, exp] of Object.entries(REFERENCE.satisfaction)) assert.deepEqual({ y: all[q].y, p: all[q].p, n: all[q].n }, exp, q);
  assert.ok(report.reference.applicable);
  assert.ok(report.reference.items.every((i) => i.ok));
});

test("department filter changes counts and sums back to the total", () => {
  const sums = dataset.departments.map((_, i) => aggregate(dataset, [i]).AQ);
  const y = sums.reduce((s, c) => s + c.y, 0);
  const totalAnswered = sums.reduce((s, c) => s + c.y + c.p + c.n + c.blank + c.invalid, 0);
  assert.equal(y, 33);
  assert.equal(totalAnswered, 135);
  assert.equal(sums[3].y + sums[3].p + sums[3].n, 3);
});

test("blank answers are counted separately", () => {
  const f = aggregate(dataset, null).F;
  assert.ok(f.blank > 0);
  assert.equal(f.y + f.p + f.n + f.blank + f.invalid, 135);
});

test("respondent names and e-mails are dropped and never stored", () => {
  assert.ok(report.droppedColumns.some((c) => c.column === "E" && c.reason === "identity"));
  assert.ok(report.droppedColumns.some((c) => c.column === "D" && c.reason === "identity"));
  const json = JSON.stringify(dataset);
  assert.ok(!json.includes("Respondent Fake"));
  assert.ok(!json.includes("respondent001@example.com"));
});

test("redacted comments hide names, numbers and e-mails", () => {
  const all = dataset.texts.map((t) => t.red).join("\n");
  assert.ok(!all.includes("Test Alpha"));
  assert.ok(!all.includes("99123456"));
  assert.ok(!all.includes("test.person@example.com"));
  assert.ok(!all.includes("تجريبي"));
  assert.ok(dataset.texts.some((t) => t.raw.includes("Test Alpha")));
});

test("placeholders such as 'لا يوجد' and 'N/A' are not counted as comments", () => {
  assert.ok((dataset.placeholders.AT ?? 0) > 0);
  assert.ok(dataset.texts.every((t) => !["لا يوجد", "N/A", "-"].includes(t.raw)));
});

test("answer parsing", () => {
  assert.equal(parseAnswer("Yes - نعم"), "y");
  assert.equal(parseAnswer("نعم"), "y");
  assert.equal(parseAnswer("To some extent - إلى حد ما"), "p");
  assert.equal(parseAnswer("الى حد ما"), "p");
  assert.equal(parseAnswer("Partially"), "p");
  assert.equal(parseAnswer("No"), "n");
  assert.equal(parseAnswer("لا"), "n");
  assert.equal(parseAnswer("Maybe later"), "x");
  assert.equal(parseAnswer("   "), null);
});

test("themes: one comment can carry several themes", () => {
  const t = detectThemes("نحتاج إلى تدريب عملي في الموقع مع مدرب متخصص.");
  assert.ok(t.includes("practical") && t.includes("trainer"));
  assert.ok(detectThemes("يجب توفير وقت مخصص للتدريب").includes("time"));
});

test("header matching works with Arabic-only and English-only headers in any order", () => {
  const ar = ["القسم", ...QUESTIONS.map((q) => q.ar)].reverse();
  const en = ["Department", ...QUESTIONS.map((q) => q.en)];
  for (const headers of [ar, en]) {
    const { mapped, dept } = mapColumns(headers, [headers.map(() => "Yes")]);
    for (const q of QUESTIONS) assert.equal(mapped[q.id].header, headers.find((h) => h === q.ar || h === q.en), q.id);
    assert.notEqual(dept, null);
  }
});

test("missing columns produce warnings; missing department blocks activation", () => {
  const headers = ["ID", "Name", ...QUESTIONS.filter((q) => q.id !== "AQ").map((q) => q.en)];
  const { mapped, dept } = mapColumns(headers, [headers.map(() => "Yes")]);
  assert.equal(mapped.AQ.column, null);
  assert.equal(dept, null);
});

test("each tab starts with its satisfaction question and every question appears once", () => {
  const ids = QUESTIONS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const t of TABS) assert.equal(QUESTIONS.find((q) => q.tab === t.id)!.kind, "satisfaction");
});

test("redact helper", () => {
  const dict = buildNameDictionary(["Ahmed Example", "الفريق كله"]);
  assert.equal(redact("Thanks Ahmed for help", dict), "Thanks [name] for help");
  assert.equal(redact("شكرا المهندس سالم", dict), "شكرا المهندس [اسم]");
  assert.ok(!redact("call 91234567", dict).includes("91234567"));
});

import { extractNames, groupPeople, applyRules, skeleton } from "../../src/features/cdp/people";

test("people: names are pulled out of free text and fillers dropped", () => {
  assert.deepEqual(extractNames("Mr.Test Alpha& Ms. Sample"), ["Test Alpha", "Sample"]);
  assert.deepEqual(extractNames("سالم من هواوي وليلى الحارثيه من عمانتل"), ["سالم", "ليلى الحارثيه"]);
  assert.deepEqual(extractNames("Nobody"), []);
  assert.deepEqual(extractNames("الكل متعاون كفريق واحد"), []);
  assert.deepEqual(extractNames("Thanks to our team leader (Karim Nadeem) and Mr Rafael for their support during work and training"), ["Karim Nadeem", "Rafael"]);
  assert.deepEqual(extractNames("work pressure and lack of time"), []);
});

test("people: spellings across scripts are grouped and counted once per respondent", () => {
  assert.equal(skeleton("Huda"), skeleton("هدى"));
  assert.equal(skeleton("Pradeep"), skeleton("براديب"));
  assert.equal(skeleton("Ibrahim"), skeleton("ابراهيم"));
  const people = groupPeople([
    { row: 1, d: 0, text: "Karim Nadeem\nهدى" },
    { row: 2, d: 0, text: "كريم نديم / Huda / Huda" },
    { row: 3, d: 1, text: "Kareem" },
    { row: 4, d: 1, text: "Rafael" },
  ]);
  const karim = people.find((p) => p.label.startsWith("Karim"))!;
  assert.equal(karim.mentions, 3);
  assert.deepEqual(karim.depts, { 0: 2, 1: 1 });
  assert.equal(people.find((p) => p.label === "Huda" || p.label === "هدى")!.mentions, 2);
  const rafael = people.find((p) => p.label === "Rafael")!;
  const merged = applyRules(people, [{ key: rafael.key, mergeInto: karim.key, label: null, hidden: false }]);
  assert.equal(merged.find((p) => p.key === karim.key)!.mentions, 4);
  assert.equal(applyRules(people, [{ key: rafael.key, mergeInto: null, label: null, hidden: true }]).find((p) => p.key === rafael.key)!.hidden, true);
});
