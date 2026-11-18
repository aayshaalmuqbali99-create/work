import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { CLOSED_KINDS, MIN_GROUP_SIZE, QUESTIONS, THEMES } from "./config";
import { aggregate, type Counts, type Dataset, type ImportReport } from "./parse";
import { applyRules, extractNames, groupPeople, type PersonView } from "./people";

export async function getUserCdpRaw(user: SessionUser) {
  if (user.role === "ADMIN") return true;
  const row = await db.user.findUnique({ where: { id: user.id }, select: { cdpRaw: true } });
  return !!row?.cdpRaw;
}

export type CommentView = {
  id: string;
  key: string;
  q: string;
  /** Department index, or -1 when hidden (small department) / not specified. */
  d: number;
  text: string; // identifying details removed (management view)
  raw?: string; // original — only present for authorised users
  themes: string[];
  manual: boolean;
};

export type DashboardView = {
  meta: { fileName: string; activatedAt: string; uploadedBy: string; total: number };
  departments: { name: string; count: number; small: boolean; selectable: boolean }[];
  /** Counts per closed question; "all" plus one entry per selectable department index. */
  counts: Record<string, Record<string, Counts>>;
  questions: Record<string, { header: string | null; column: string | null; matchedBy: string | null }>;
  comments: CommentView[];
  placeholders: Record<string, number>;
  thanksCounts: Record<string, number>;
  names: { id: string; d: number; text: string }[] | null; // null = not authorised
  /** People who supported participants, most-named first — authorised users only. */
  people: PersonView[] | null;
  /** What management may see about them: how many people were named, and how many by more than one participant. */
  peopleSummary: { people: number; repeated: number };
  /** Whether this user can open the thanks board. */
  thanksBoard: boolean;
  raw: boolean;
  minGroup: number;
  missing: string[];
};

/**
 * Builds exactly what the signed-in user may see. Everything is computed on the server:
 * management users never receive original comments, supporter names or per-department results of small departments.
 */
export async function getDashboard(user: SessionUser, opts: { management?: boolean } = {}): Promise<DashboardView | null> {
  const row = await db.surveyDataset.findFirst({ where: { status: "ACTIVE" }, orderBy: { activatedAt: "desc" } });
  if (!row) return null;
  const ds = row.data as unknown as Dataset;
  // The management export is always built at management level, whoever asks for it.
  const raw = opts.management ? false : await getUserCdpRaw(user);

  const departments = ds.departments.map((d) => {
    const small = d.count < MIN_GROUP_SIZE;
    return { name: d.name || "—", count: d.count, small, selectable: raw || !small };
  });
  const counts: DashboardView["counts"] = { all: aggregate(ds, null) };
  departments.forEach((d, i) => {
    if (d.selectable) counts[String(i)] = aggregate(ds, [i]);
  });

  const tags = await db.surveyThemeTag.findMany({ where: { key: { in: ds.texts.map((t) => t.key) } } });
  const tagMap = new Map(tags.map((t) => [t.key, t.themes]));
  const validThemes = new Set(THEMES.map((t) => t.id));
  const comments: CommentView[] = ds.texts
    // Thanks messages name people, so management sees only their count.
    .filter((t) => {
      const kind = QUESTIONS.find((q) => q.id === t.q)?.kind;
      return kind !== "names" && (raw || kind !== "thanks");
    })
    .map((t) => {
      const manual = tagMap.get(t.key);
      const hide = !raw && (departments[t.d]?.small ?? false);
      return {
        id: t.id,
        key: t.key,
        q: t.q,
        d: hide ? -1 : t.d,
        text: t.red,
        ...(raw ? { raw: t.raw } : {}),
        themes: (manual ?? t.auto).filter((x) => validThemes.has(x)),
        manual: !!manual,
      };
    });

  const thanksCounts: Record<string, number> = {};
  for (const t of ds.texts) thanksCounts[t.q] = (thanksCounts[t.q] ?? 0) + 1;
  const names = raw
    ? ds.texts.filter((t) => QUESTIONS.find((q) => q.id === t.q)?.kind === "names").map((t) => ({ id: t.id, d: t.d, text: t.raw }))
    : null;

  const nameQ = QUESTIONS.find((q) => q.kind === "names")!.id;
  const rules = await db.surveyNameRule.findMany();
  const allPeople = applyRules(
    groupPeople(ds.texts.filter((t) => t.q === nameQ).map((t) => ({ row: Number(t.id.split("-").pop()), d: t.d, text: t.raw }))),
    rules,
  );
  const visiblePeople = allPeople.filter((p) => !p.hidden);
  const thanksBoardPublic = await isThanksBoardPublic();

  return {
    people: raw ? allPeople : null,
    peopleSummary: { people: visiblePeople.length, repeated: visiblePeople.filter((p) => p.mentions > 1).length },
    thanksBoard: raw || thanksBoardPublic,
    meta: { fileName: row.fileName, activatedAt: (row.activatedAt ?? row.createdAt).toISOString(), uploadedBy: row.uploadedBy, total: ds.responses.length },
    departments,
    counts,
    questions: ds.questions,
    comments,
    placeholders: ds.placeholders,
    thanksCounts,
    names,
    raw,
    minGroup: MIN_GROUP_SIZE,
    missing: QUESTIONS.filter((q) => !ds.questions[q.id]?.column).map((q) => q.id),
  };
}

export async function listDatasets() {
  return db.surveyDataset.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, status: true, fileName: true, fileSize: true, rowCount: true, report: true, uploadedBy: true, activatedAt: true, createdAt: true },
  }) as Promise<{ id: string; status: string; fileName: string; fileSize: number; rowCount: number; report: ImportReport; uploadedBy: string; activatedAt: Date | null; createdAt: Date }[]>;
}

export const closedQuestionIds = QUESTIONS.filter((q) => CLOSED_KINDS.includes(q.kind)).map((q) => q.id);

export const THANKS_BOARD_SETTING = "thanksBoardPublic";

export async function isThanksBoardPublic() {
  const row = await db.surveySetting.findUnique({ where: { key: THANKS_BOARD_SETTING } });
  return row?.value === true;
}

export type ThanksBoard = {
  people: { key: string; label: string; mentions: number }[];
  respondents: number; // participants who named at least one person
  fileName: string;
  activatedAt: string;
  isPublic: boolean;
  canPublish: boolean;
};

/**
 * Thanks board: people who helped colleagues during the CDP programme, most-named first.
 * Visible to authorised users, and to every signed-in user once an admin publishes it.
 * Returns null when the user may not see it (or no data is published).
 */
export async function getThanksBoard(user: SessionUser): Promise<ThanksBoard | null> {
  const [row, raw, isPublic] = await Promise.all([
    db.surveyDataset.findFirst({ where: { status: "ACTIVE" }, orderBy: { activatedAt: "desc" } }),
    getUserCdpRaw(user),
    isThanksBoardPublic(),
  ]);
  if (!row || (!raw && !isPublic)) return null;
  const ds = row.data as unknown as Dataset;
  const nameQ = QUESTIONS.find((q) => q.kind === "names")!.id;
  const answers = ds.texts.filter((t) => t.q === nameQ);
  const people = applyRules(
    groupPeople(answers.map((t) => ({ row: Number(t.id.split("-").pop()), d: t.d, text: t.raw }))),
    await db.surveyNameRule.findMany(),
  )
    .filter((p) => !p.hidden)
    .map((p) => ({ key: p.key, label: p.label, mentions: p.mentions }));
  return {
    people,
    respondents: answers.filter((t) => extractNames(t.raw).length > 0).length,
    fileName: row.fileName,
    activatedAt: (row.activatedAt ?? row.createdAt).toISOString(),
    isPublic,
    canPublish: user.role === "ADMIN",
  };
}
