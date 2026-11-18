/**
 * Builds the single data model of the GM dashboard from the survey workbook.
 * Aggregated counts only, plus (at the owner's request) the names of the people participants thanked for supporting
 * their training, with how many participants named each. No respondent names, comments or individual responses.
 */
import { importWorkbook, aggregate, type Counts } from "../src/features/cdp/parse";
import { QUESTIONS, CLOSED_KINDS, THEMES, DEPARTMENT_LABELS, type TabId } from "../src/features/cdp/config";
import { normalize } from "../src/features/cdp/text";
import { extractNames, groupPeople } from "../src/features/cdp/people";

type Opt = "y" | "p" | "n";
const PROGRAMMES: { id: TabId; title: string; titleAr: string; featured: { id: string; title: string; titleAr: string }[] }[] = [
  { id: "general", title: "CDP Overall", titleAr: "برنامج CDP بشكل عام", featured: [] },
  { id: "cdpt", title: "CDP-T Online Courses", titleAr: "الدورات الإلكترونية CDP‑T", featured: [] },
  {
    id: "ojt",
    title: "On-the-Job Training",
    titleAr: "التدريب أثناء العمل",
    featured: [
      { id: "V", title: "Planned training delivery", titleAr: "تقديم التدريب المخطط له" },
      { id: "X", title: "Opportunities for hands-on practice", titleAr: "فرص التطبيق العملي" },
      { id: "Y", title: "Accuracy of recorded progress in AGIOPS", titleAr: "دقة التقدم المسجل في AGIOPS" },
    ],
  },
  { id: "huawei", title: "Huawei OMS Support", titleAr: "دعم فريق Huawei OMS", featured: [] },
];

/** Findings: which question and which answer(s) are counted. Text uses {pct}, {count}, {total}. */
const INSIGHTS = [
  { id: "delivery", title: "Programme Delivery", titleAr: "تنفيذ البرنامج", icon: "layers", programme: "general", q: "G", opts: ["n"] as Opt[],
    text: "reported that programme delivery lacked clarity and structure.", textAr: "أفادوا بأن تنفيذ البرنامج افتقر إلى الوضوح والتنظيم." },
  { id: "transfer", title: "Learning Transfer", titleAr: "تطبيق التعلّم", icon: "transfer", programme: "cdpt", q: "O", opts: ["n"] as Opt[],
    text: "reported that they could not apply what they learned from the online courses at work.", textAr: "أفادوا بأنهم لم يتمكنوا من تطبيق ما تعلموه من الدورات الإلكترونية في عملهم." },
  { id: "practical", title: "Practical Training", titleAr: "التدريب العملي", icon: "tool", programme: "ojt", q: "AB", opts: ["y"] as Opt[],
    text: "reported challenges during on-the-job training.", textAr: "أفادوا بمواجهة تحديات أثناء التدريب أثناء العمل." },
];
const HEADLINES: Record<string, { q: string; opts: Opt[]; text: string; textAr: string }> = {
  general: { q: "G", opts: ["n"], text: "said programme delivery lacked clarity and structure.", textAr: "أفادوا بأن تنفيذ البرنامج افتقر إلى الوضوح والتنظيم." },
  cdpt: { q: "O", opts: ["n"], text: "could not apply what they learned from the online courses at work.", textAr: "لم يتمكنوا من تطبيق ما تعلموه من الدورات الإلكترونية في عملهم." },
  ojt: { q: "AB", opts: ["y"], text: "reported challenges.", textAr: "أفادوا بمواجهة تحديات." },
  huawei: { q: "AO", opts: ["y"], text: "were satisfied overall with the support provided by the Huawei OMS team.", textAr: "راضون بشكل عام عن الدعم المقدم من فريق Huawei OMS." },
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
    // Display names from DEPARTMENT_LABELS (e.g. "Electrotechnical" in the file is shown as "Electromechanical").
    departments: dataset.departments.map((d) => {
      const label = Object.entries(DEPARTMENT_LABELS).find(([k]) => normalize(k) === normalize(d.name))?.[1];
      return { name: label ?? d.name, count: d.count };
    }),
    programmes: PROGRAMMES.map((p) => {
      const qs = QUESTIONS.filter((q) => q.tab === p.id && CLOSED_KINDS.includes(q.kind));
      const sat = qs.find((q) => q.kind === "satisfaction")!;
      const h = HEADLINES[p.id];
      return {
        id: p.id,
        title: p.title,
        titleAr: p.titleAr,
        satisfactionQuestion: sat.en,
        satisfactionQuestionAr: sat.ar,
        satisfaction: c3(all[sat.id]),
        headline: { count: sum(h.q, h.opts), text: h.text, textAr: h.textAr },
        featured: p.featured.map((f) => {
          const q = QUESTIONS.find((x) => x.id === f.id)!;
          return { ...f, question: q.en, questionAr: q.ar, counts: c3(all[f.id]) };
        }),
        questions: qs
          .filter((q) => q.kind !== "satisfaction" && !p.featured.some((f) => f.id === q.id))
          .map((q) => ({ id: q.id, label: q.en, labelAr: q.ar, challenge: q.kind === "challenge", counts: c3(all[q.id]) })),
      };
    }),
    insights: INSIGHTS.map((i) => ({ ...i, count: sum(i.q, i.opts) })),
    recognition: (() => {
      const nameQ = QUESTIONS.find((q) => q.kind === "names")!.id;
      const answers = dataset.texts.filter((t) => t.q === nameQ);
      const rowsOf = new Map<string, number[]>();
      const people = groupPeople(answers.map((t) => ({ row: Number(t.id.split("-").pop()), d: t.d, text: t.raw })));
      // Which participants named each person (row numbers only, used by the build to merge spellings without double
      // counting; removed before the page is written).
      for (const p of people) {
        const keyFirst = p.variants.map((v) => v.text);
        rowsOf.set(p.key, answers.filter((t) => groupPeople([{ row: 0, d: 0, text: t.raw }]).some((g) => g.variants.some((v) => keyFirst.includes(v.text)))).map((t) => Number(t.id.split("-").pop())));
      }
      return {
        respondents: answers.filter((t) => extractNames(t.raw).length > 0).length,
        people: people.map((p) => ({ name: p.label, count: p.mentions, rows: rowsOf.get(p.key) ?? [] })), // most named first
      };
    })(),
    suggestions: (() => {
      // Employees' own improvement suggestions (open answers), with names, numbers and e-mails removed.
      // Answers that are not suggestions are left out; the same text written by one employee in both questions is shown once.
      const NOT_SUGGESTION = new Set(["everything", "thanks", "thank you", "شكرا", "شكرًا", "nl", "yes", "no", "كلها جيده", "كلها جيدة", "nothing", "لا شيء"].map(normalize));
      const SOURCES = [
        { id: "AT", title: "Improving the CDP programme", titleAr: "تحسين برنامج التطوير الوظيفي" },
        { id: "AP", title: "Training requests & Huawei OMS support", titleAr: "الطلبات التدريبية ودعم Huawei OMS" },
      ];
      const items: { text: string; sources: string[]; themes: string[] }[] = [];
      const seen = new Map<string, number>();
      for (const t of dataset.texts) {
        if (!SOURCES.some((x) => x.id === t.q)) continue;
        const clean = t.red.replace(/\s+/g, " ").trim();
        const n = normalize(clean.replace(/\[(name|اسم|#|•)\]/g, ""));
        if (!n || NOT_SUGGESTION.has(n)) continue;
        const key = t.id.split("-").pop() + "|" + n; // same employee, same text
        if (seen.has(key)) {
          const it = items[seen.get(key)!];
          if (!it.sources.includes(t.q)) it.sources.push(t.q);
          continue;
        }
        seen.set(key, items.length);
        items.push({ text: clean, sources: [t.q], themes: t.auto });
      }
      return {
        sources: SOURCES,
        themes: THEMES.map((x) => ({ id: x.id, en: x.en, ar: x.ar })),
        items,
      };
    })(),
    action: "Assign a programme lead to align training with job requirements, schedule supervised practice and verify training delivery against AGIOPS records.",
    actionAr: "تعيين مسؤول للبرنامج لمواءمة التدريب مع متطلبات الوظائف، وجدولة تطبيق عملي بإشراف، والتحقق من تنفيذ التدريب مقارنةً بسجلات AGIOPS.",
  };
};
