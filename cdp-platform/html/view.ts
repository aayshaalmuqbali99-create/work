/**
 * The data a results page shows, built from a parsed workbook with the same rules as the platform.
 * `management: true` = what management may see (used for the ready-made report): aggregated counts only,
 * comments with identifying details removed, no names of supporters, no thanks messages, small departments
 * only inside the overall results. `management: false` = the upload page, used by whoever holds the Excel file.
 */
import { CLOSED_KINDS, DEPARTMENT_LABELS, MIN_GROUP_SIZE, QUESTIONS, THEMES } from "../src/features/cdp/config";
import { aggregate, type Counts, type Dataset, type ImportReport } from "../src/features/cdp/parse";
import { applyRules, groupPeople } from "../src/features/cdp/people";
import { normalize } from "../src/features/cdp/text";

export type HtmlComment = { id: string; q: string; d: number; text: string; raw?: string; themes: string[] };
export type HtmlView = {
  mode: "upload" | "report";
  fileName: string;
  updated: string;
  total: number;
  departments: { name: string; count: number; small: boolean; selectable: boolean }[];
  counts: Record<string, Record<string, Counts>>;
  questions: Record<string, { header: string | null; column: string | null }>;
  missing: string[];
  comments: HtmlComment[];
  placeholders: Record<string, number>;
  thanksCounts: Record<string, number>;
  people: { label: string; variants: string[]; mentions: number; depts: Record<number, number> }[] | null;
  peopleSummary: { people: number; repeated: number };
  raw: boolean;
  minGroup: number;
  report?: { errors: ImportReport["errors"]; warnings: ImportReport["warnings"]; referenceOk: boolean; referenceApplicable: boolean };
};

const LABELS = new Map(Object.entries(DEPARTMENT_LABELS).map(([k, v]) => [normalize(k), v]));
const deptLabel = (n: string) => LABELS.get(normalize(n)) ?? n;

export function buildView(ds: Dataset, opts: { management: boolean; fileName: string; updated: string; report?: ImportReport }): HtmlView {
  const raw = !opts.management;
  const departments = ds.departments.map((d) => {
    const small = d.count < MIN_GROUP_SIZE;
    return { name: deptLabel(d.name) || "—", count: d.count, small, selectable: raw || !small };
  });
  const counts: HtmlView["counts"] = { all: aggregate(ds, null) };
  departments.forEach((d, i) => {
    if (d.selectable) counts[String(i)] = aggregate(ds, [i]);
  });
  const kind = (q: string) => QUESTIONS.find((x) => x.id === q)?.kind;
  const valid = new Set(THEMES.map((t) => t.id));
  const comments: HtmlComment[] = ds.texts
    .filter((t) => kind(t.q) !== "names" && (raw || kind(t.q) !== "thanks"))
    .map((t) => ({
      id: t.id,
      q: t.q,
      d: !raw && departments[t.d]?.small ? -1 : t.d,
      text: t.red,
      ...(raw ? { raw: t.raw } : {}),
      themes: t.auto.filter((x) => valid.has(x)),
    }));
  const thanksCounts: Record<string, number> = {};
  for (const t of ds.texts) thanksCounts[t.q] = (thanksCounts[t.q] ?? 0) + 1;
  const nameQ = QUESTIONS.find((q) => q.kind === "names")!.id;
  const people = applyRules(
    groupPeople(ds.texts.filter((t) => t.q === nameQ).map((t) => ({ row: Number(t.id.split("-").pop()), d: t.d, text: t.raw }))),
    [],
  );
  const questions: HtmlView["questions"] = {};
  for (const q of QUESTIONS) questions[q.id] = { header: ds.questions[q.id]?.header ?? null, column: ds.questions[q.id]?.column ?? null };
  return {
    mode: raw ? "upload" : "report",
    fileName: opts.fileName,
    updated: opts.updated,
    total: ds.responses.length,
    departments,
    counts,
    questions,
    missing: QUESTIONS.filter((q) => !ds.questions[q.id]?.column).map((q) => q.id),
    comments,
    placeholders: ds.placeholders,
    thanksCounts,
    people: raw ? people.map((p) => ({ label: p.label, variants: [...new Set(p.variants.map((v) => v.text))], mentions: p.mentions, depts: p.depts })) : null,
    peopleSummary: { people: people.length, repeated: people.filter((p) => p.mentions > 1).length },
    raw,
    minGroup: MIN_GROUP_SIZE,
    report: opts.report
      ? { errors: opts.report.errors, warnings: opts.report.warnings, referenceOk: opts.report.reference.items.every((i) => i.ok), referenceApplicable: opts.report.reference.applicable }
      : undefined,
  };
}

export const closedIds = QUESTIONS.filter((q) => CLOSED_KINDS.includes(q.kind)).map((q) => q.id);
