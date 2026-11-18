"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { EyeOff, Lock, Pencil, Repeat, Undo2, Users } from "lucide-react";
import type { DashboardView } from "@/features/cdp/data";
import type { PersonView } from "@/features/cdp/people";
import { setNameRuleAction } from "@/features/cdp/actions";
import { cn } from "@/lib/utils";
import { useFormat } from "./shared";

/**
 * People who supported participants (Omantel and Huawei OMS), ranked by how many DIFFERENT participants named
 * them. Names are shown to authorised users only; management sees counts.
 */
export function PeopleRecognition({ view, dept, present }: { view: DashboardView; dept: number | null; present: boolean }) {
  const t = useTranslations("Cdp");
  const f = useFormat();
  const [showHidden, setShowHidden] = useState(false);
  const people = useMemo(
    () =>
      (view.people ?? [])
        .map((p) => ({ ...p, n: dept === null ? p.mentions : (p.depts[dept] ?? 0) }))
        .filter((p) => p.n > 0)
        .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)),
    [view.people, dept],
  );

  if (!view.people) {
    return (
      <div className="rounded-card border border-line bg-surface p-5" data-testid="people-locked">
        <h3 className="flex items-center gap-2 font-semibold text-navy"><Users className="size-5 text-amber-600" aria-hidden="true" />{t("peopleTitle")}</h3>
        <p className="mt-2 text-sm text-muted">
          {t("peopleSummary", { people: f.int(view.peopleSummary.people), repeated: f.int(view.peopleSummary.repeated) })}
        </p>
        <p className="mt-2 flex items-start gap-2 text-sm text-muted"><Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{t("peopleRestricted")}</p>
      </div>
    );
  }

  const visible = people.filter((p) => !p.hidden);
  const repeated = visible.filter((p) => p.n > 1);
  const once = visible.filter((p) => p.n === 1);
  const hidden = people.filter((p) => p.hidden);
  const max = Math.max(1, ...repeated.map((p) => p.n));
  const canEdit = !present;
  const targets = visible.map((p) => ({ key: p.key, label: p.label }));

  return (
    <div className="rounded-card border border-line bg-surface p-5" data-testid="people">
      <h3 className="flex items-center gap-2 text-lg font-bold text-navy"><Users className="size-5 text-amber-600" aria-hidden="true" />{t("peopleTitle")}</h3>
      <p className="mt-1 text-sm text-muted">{t("peopleNote")}</p>
      <p className="mt-2 text-sm text-ink">
        {t("peopleSummary", { people: f.int(visible.length), repeated: f.int(repeated.length) })}
      </p>
      {!present && <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-900"><Lock className="size-3.5" aria-hidden="true" />{t("peopleVisibility")}</p>}

      {repeated.length > 0 && (
        <>
          <h4 className="mt-5 flex items-center gap-2 font-semibold text-navy"><Repeat className="size-4 text-teal" aria-hidden="true" />{t("peopleRepeated")}</h4>
          <ol className="mt-3 space-y-2" data-testid="people-repeated">
            {repeated.map((p, i) => (
              <PersonRow key={p.key} p={p} n={p.n} rank={i + 1} max={max} canEdit={canEdit} targets={targets} />
            ))}
          </ol>
        </>
      )}

      {once.length > 0 && (
        <>
          <h4 className="mt-6 font-semibold text-navy">{t("peopleOnce", { n: f.int(once.length) })}</h4>
          <ul className="mt-3 flex flex-wrap gap-2" data-testid="people-once">
            {once.map((p) => (
              <PersonChip key={p.key} p={p} canEdit={canEdit} targets={targets} />
            ))}
          </ul>
        </>
      )}
      {!visible.length && <p className="mt-4 text-sm text-muted">{t("noAnswers")}</p>}

      {canEdit && hidden.length > 0 && (
        <div className="mt-5 text-sm">
          <button type="button" className="text-teal underline" onClick={() => setShowHidden((v) => !v)}>{t("peopleHiddenToggle", { n: f.int(hidden.length) })}</button>
          {showHidden && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {hidden.map((p) => <HiddenChip key={p.key} p={p} />)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

type Target = { key: string; label: string };

function useRule() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (key: string, rule: Parameters<typeof setNameRuleAction>[1]) =>
    start(async () => {
      const r = await setNameRuleAction(key, rule);
      if (r.ok) router.refresh();
    });
  return { pending, run };
}

function Variants({ p }: { p: PersonView }) {
  const t = useTranslations("Cdp");
  const others = [...new Set(p.variants.map((v) => v.text))].filter((v) => v !== p.label);
  if (!others.length) return null;
  return <span className="block text-xs text-muted" dir="auto">{t("peopleAlsoWritten")}: {others.join(" · ")}</span>;
}

function PersonRow({ p, n, rank, max, canEdit, targets }: { p: PersonView; n: number; rank: number; max: number; canEdit: boolean; targets: Target[] }) {
  const t = useTranslations("Cdp");
  const f = useFormat();
  const [editing, setEditing] = useState(false);
  return (
    <li className="rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2.5">
      <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[2rem_minmax(0,16rem)_1fr_auto]">
        <span className="grid size-8 place-items-center rounded-full bg-navy text-sm font-bold text-white">{f.int(rank)}</span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink" dir="auto">{p.label}</span>
          <Variants p={p} />
        </span>
        <span className="hidden h-3 overflow-hidden rounded-full bg-line sm:block" aria-hidden="true">
          <span className="block h-full rounded-full bg-amber-500 print:[print-color-adjust:exact]" style={{ width: `${(n / max) * 100}%` }} />
        </span>
        <span className="flex items-center gap-2 whitespace-nowrap text-sm">
          <strong className="tabular-nums text-navy">{t("mentionedBy", { n: f.int(n) })}</strong>
          {canEdit && (
            <button type="button" onClick={() => setEditing((v) => !v)} className="rounded-full p-1.5 text-teal hover:bg-surface" aria-label={t("peopleEdit")} title={t("peopleEdit")}>
              <Pencil className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </span>
      </div>
      {editing && <EditPerson p={p} targets={targets} onDone={() => setEditing(false)} />}
    </li>
  );
}

function PersonChip({ p, canEdit, targets }: { p: PersonView; canEdit: boolean; targets: Target[] }) {
  const t = useTranslations("Cdp");
  const [editing, setEditing] = useState(false);
  return (
    <li className={cn("rounded-2xl bg-canvas px-3 py-1.5 text-sm", editing && "w-full")}>
      <span className="inline-flex items-center gap-1.5">
        <span dir="auto">{p.label}</span>
        {canEdit && (
          <button type="button" onClick={() => setEditing((v) => !v)} className="rounded-full p-1 text-teal hover:bg-surface" aria-label={t("peopleEdit")} title={t("peopleEdit")}>
            <Pencil className="size-3" aria-hidden="true" />
          </button>
        )}
      </span>
      {editing && <EditPerson p={p} targets={targets} onDone={() => setEditing(false)} />}
    </li>
  );
}

function EditPerson({ p, targets, onDone }: { p: PersonView; targets: Target[]; onDone: () => void }) {
  const t = useTranslations("Cdp");
  const { pending, run } = useRule();
  const [label, setLabel] = useState(p.label);
  const [into, setInto] = useState("");
  return (
    <div className="mt-2 grid gap-2 rounded-xl border border-line bg-surface p-3 text-sm sm:grid-cols-2">
      <label className="space-y-1">
        <span className="block text-xs font-medium text-navy">{t("peopleRename")}</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} dir="auto" className="w-full rounded-lg border border-line px-2.5 py-1.5" />
      </label>
      <label className="space-y-1">
        <span className="block text-xs font-medium text-navy">{t("peopleMergeInto")}</span>
        <select value={into} onChange={(e) => setInto(e.target.value)} className="w-full rounded-lg border border-line px-2.5 py-1.5">
          <option value="">—</option>
          {targets.filter((x) => x.key !== p.key).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            run(p.key, { label: label !== p.label ? label : null, mergeInto: into || null });
            onDone();
          }}
          className="rounded-full bg-navy px-4 py-1.5 font-semibold text-white disabled:opacity-60"
        >
          {t("save")}
        </button>
        <button type="button" disabled={pending} onClick={() => { run(p.key, { hidden: true }); onDone(); }} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-navy">
          <EyeOff className="size-3.5" aria-hidden="true" />{t("peopleHide")}
        </button>
        {(p.merged.length > 0) && <span className="self-center text-xs text-muted">{t("peopleMergedN", { n: p.merged.length })}</span>}
        <button type="button" onClick={onDone} className="px-2 py-1.5 text-muted">{t("cancel")}</button>
      </div>
    </div>
  );
}

function HiddenChip({ p }: { p: PersonView }) {
  const t = useTranslations("Cdp");
  const { pending, run } = useRule();
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-zinc-600">
      <span dir="auto">{p.label}</span>
      <button type="button" disabled={pending} onClick={() => run(p.key, null)} className="rounded-full p-0.5 text-teal" aria-label={t("peopleRestore")} title={t("peopleRestore")}>
        <Undo2 className="size-3.5" aria-hidden="true" />
      </button>
    </li>
  );
}
