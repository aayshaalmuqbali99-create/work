/**
 * Builds the single data model of the GM dashboard from the survey workbook.
 * Only aggregated counts leave this file: no names, comments or individual responses.
 */
import { importWorkbook, aggregate, type Counts } from "../src/features/cdp/parse";
import { QUESTIONS, CLOSED_KINDS, type TabId } from "../src/features/cdp/config";

type Opt = "y" | "p" | "n";
const PROGRAMMES: { id: TabId; title: string; featured: { id: string; title: string }[] }[] = [
  { id: "general", title: "CDP Overall", featured: [] },
  { id: "cdpt", title: "CDP-T Online Courses", featured: [] },
  {
    id: "ojt",
    title: "On-the-Job Training",
    featured: [
      { id: "V", title: "Planned training delivery" },
      { id: "X", title: "Opportunities for hands-on practice" },
      { id: "Y", title: "Accuracy of recorded progress in AGIOPS" },
    ],
  },
  { id: "huawei", title: "Huawei OMS Support", featured: [] },
];

/** Findings: which question and which answer(s) are counted. Text uses {pct}, {count}, {total}. */
const INSIGHTS = [
  { id: "delivery", title: "Programme Delivery", icon: "layers", programme: "general", q: "G", opts: ["n"] as Opt[], text: "reported that programme delivery lacked clarity and structure." },
  { id: "transfer", title: "Learning Transfer", icon: "transfer", programme: "cdpt", q: "O", opts: ["n"] as Opt[], text: "reported that they could not apply what they learned from the online courses at work." },
  { id: "practical", title: "Practical Training", icon: "tool", programme: "ojt", q: "AB", opts: ["y"] as Opt[], text: "reported challenges during on-the-job training." },
];
const HEADLINES: Record<string, { q: string; opts: Opt[]; text: string }> = {
  general: { q: "G", opts: ["n"], text: "said programme delivery lacked clarity and structure." },
  cdpt: { q: "O", opts: ["n"], text: "could not apply what they learned from the online courses at work." },
  ojt: { q: "AB", opts: ["y"], text: "reported challenges." },
  huawei: { q: "AO", opts: ["y"], text: "were satisfied overall with the support provided by the Huawei OMS team." },
};

(globalThis as unknown as { GM_DATA: unknown }).GM_DATA = (data: Uint8Array, fileName: string, excludedTests: number) => {
  const { dataset, report } = importWorkbook(data);
  if (report.errors.length) throw new Error("Workbook errors: " + report.errors.map((e) => e.code).join(", "));
  const all = aggregate(dataset, null);
  const total = dataset.responses.length;
  const c3 = (c: Counts) => ({ y: c.y, p: c.p, n: c.n, blank: c.blank });
  const sum = (q: string, opts: Opt[]) => opts.reduce((s, o) => s + all[q][o], 0);
  return {
    title: "CDP 2026 Training Evaluation",
    source: { fileName, responses: total, excludedTests },
    departments: dataset.departments.map((d) => ({ name: d.name, count: d.count })),
    programmes: PROGRAMMES.map((p) => {
      const qs = QUESTIONS.filter((q) => q.tab === p.id && CLOSED_KINDS.includes(q.kind));
      const sat = qs.find((q) => q.kind === "satisfaction")!;
      const h = HEADLINES[p.id];
      return {
        id: p.id,
        title: p.title,
        satisfactionQuestion: sat.en,
        satisfaction: c3(all[sat.id]),
        headline: { count: sum(h.q, h.opts), text: h.text },
        featured: p.featured.map((f) => ({ ...f, question: QUESTIONS.find((q) => q.id === f.id)!.en, counts: c3(all[f.id]) })),
        questions: qs
          .filter((q) => q.kind !== "satisfaction" && !p.featured.some((f) => f.id === q.id))
          .map((q) => ({ id: q.id, label: q.en, challenge: q.kind === "challenge", counts: c3(all[q.id]) })),
      };
    }),
    insights: INSIGHTS.map((i) => ({ ...i, count: sum(i.q, i.opts) })),
    action: "Assign a programme lead to align training with job requirements, schedule supervised practice and verify training delivery against AGIOPS records.",
  };
};
