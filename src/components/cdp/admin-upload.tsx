"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, ExternalLink, Trash2, Upload, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { activateSurveyAction, deleteSurveyAction, uploadSurveyAction, type UploadState } from "@/features/cdp/actions";
import { REFERENCE, TABS } from "@/features/cdp/config";
import type { ImportReport, Issue } from "@/features/cdp/parse";
import { btnDanger, btnPrimary, btnSecondary, StatusBadge } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { useFormat } from "./shared";

export function UploadForm() {
  const t = useTranslations("Cdp");
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadSurveyAction, { ok: false });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-3"
    >
      <p className="text-sm text-muted">{t("uploadHelp")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          required
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label={t("uploadTitle")}
          className="block w-full max-w-md text-sm file:me-3 file:rounded-full file:border-0 file:bg-teal-light file:px-4 file:py-2 file:font-medium file:text-navy"
        />
        <button type="submit" disabled={pending} className={btnPrimary}>
          <Upload className="size-4" aria-hidden="true" />
          {pending ? t("uploading") : t("uploadButton")}
        </button>
      </div>
      {state.message && (
        <p role="status" className={cn("text-sm", state.ok ? "text-emerald-700" : "text-red-600")}>{t(state.message)}</p>
      )}
    </form>
  );
}

type Row = { id: string; status: string; fileName: string; fileSize: number; rowCount: number; report: ImportReport; uploadedBy: string; activatedAt: string | null; createdAt: string };

export function DatasetList({ datasets }: { datasets: Row[] }) {
  const t = useTranslations("Cdp");
  if (!datasets.length) return <p className="text-sm text-muted">{t("noUploads")}</p>;
  return (
    <div className="space-y-4">
      {datasets.map((d, i) => <DatasetCard key={d.id} d={d} open={i === 0 || d.status === "PENDING"} />)}
    </div>
  );
}

function IssueText({ issue }: { issue: Issue }) {
  const t = useTranslations("Cdp");
  return <>{t(`issue_${issue.code}`, Object.fromEntries(Object.entries(issue.params ?? {}).map(([k, v]) => [k, String(v)])))}</>;
}

function DatasetCard({ d, open }: { d: Row; open: boolean }) {
  const t = useTranslations("Cdp");
  const f = useFormat();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<UploadState | null>(null);
  const r = d.report;
  const run = (fn: () => Promise<UploadState>) =>
    start(async () => {
      const res = await fn();
      setMsg(res);
      if (res.ok) router.refresh();
    });
  const refItems = r.reference.items;
  const refOk = refItems.every((x) => x.ok);
  const status = d.status === "ACTIVE" ? "PUBLISHED" : d.status === "PENDING" ? "REVIEW" : "ARCHIVED";
  return (
    <details open={open} className="rounded-card border border-line bg-surface p-5" data-testid="dataset">
      <summary className="flex cursor-pointer flex-wrap items-center gap-3">
        <StatusBadge status={status} label={t(`status_${d.status}`)} />
        <span className="font-semibold text-navy" dir="ltr">{d.fileName}</span>
        <span className="text-sm text-muted">{t("rowsN", { n: f.int(d.rowCount) })} · {f.date(d.createdAt)} · {d.uploadedBy}</span>
        {r.errors.length > 0 && <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600"><XCircle className="size-4" aria-hidden="true" />{t("errorsN", { n: r.errors.length })}</span>}
        {r.warnings.length > 0 && <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700"><AlertTriangle className="size-4" aria-hidden="true" />{t("warningsN", { n: r.warnings.length })}</span>}
      </summary>

      <div className="mt-4 space-y-4 text-sm">
        <p className="text-muted">{t("reportSummary", { sheet: r.sheetName, row: r.headerRow, rows: f.int(r.totalRows), dept: r.departmentColumn ? `${r.departmentColumn.column} — ${r.departmentColumn.header}` : "—" })}</p>

        {r.errors.length > 0 && (
          <ul className="space-y-1 rounded-xl bg-red-50 p-3 text-red-800" role="alert">
            {r.errors.map((e, i) => <li key={i} className="flex gap-2"><XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><IssueText issue={e} /></li>)}
          </ul>
        )}
        {r.warnings.length > 0 && (
          <ul className="space-y-1 rounded-xl bg-amber-50 p-3 text-amber-900">
            {r.warnings.map((e, i) => <li key={i} className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><IssueText issue={e} /></li>)}
          </ul>
        )}

        <div>
          <h3 className="font-semibold text-navy">{t("referenceTitle", { file: REFERENCE.fileLabel })}</h3>
          <p className="text-xs text-muted">{r.reference.applicable ? (refOk ? t("referenceAllOk") : t("referenceMismatch")) : t("referenceNA")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {refItems.map((x) => (
              <span key={x.label} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ring-1", x.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-zinc-50 text-zinc-700 ring-zinc-200")} data-testid="ref-item">
                {x.ok ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <AlertTriangle className="size-3.5" aria-hidden="true" />}
                {refLabel(x.label, t)}: {f.int(x.actual)}{x.ok ? "" : ` ≠ ${f.int(x.expected)}`}
              </span>
            ))}
          </div>
        </div>

        <details>
          <summary className="cursor-pointer font-semibold text-navy">{t("mappingTitle")}</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-start text-xs">
              <thead className="text-muted"><tr><th className="p-1.5 text-start">{t("colQuestion")}</th><th className="p-1.5 text-start">{t("colTab")}</th><th className="p-1.5 text-start">{t("colColumn")}</th><th className="p-1.5 text-start">{t("colHeader")}</th></tr></thead>
              <tbody>
                {r.questions.map((q) => (
                  <tr key={q.id} className="border-t border-line align-top">
                    <td className="p-1.5 font-mono">{q.id}</td>
                    <td className="p-1.5">{TABS.findIndex((x) => x.id === q.tab) + 1}</td>
                    <td className={cn("p-1.5 font-mono", !q.column ? "text-red-600" : q.column !== q.expected || q.matchedBy === "position" ? "text-amber-700" : "text-emerald-700")}>
                      {q.column ?? t("notFound")}{q.matchedBy === "position" ? ` (${t("byPosition")})` : ""}
                    </td>
                    <td className="whitespace-pre-line p-1.5" dir="auto">{q.header ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.droppedColumns.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              {t("droppedColumns")}: {r.droppedColumns.map((c) => `${c.column} (${t(`dropped_${c.reason}`)}: ${c.header.slice(0, 40)})`).join(" · ")}
            </p>
          )}
          {r.unknownValues.length > 0 && (
            <p className="mt-2 text-xs text-amber-800">{t("unknownList")}: {r.unknownValues.map((u) => `${u.q}: “${u.value}” ×${u.count}`).join(" · ")}</p>
          )}
        </details>

        <div className="flex flex-wrap items-center gap-2">
          {d.status !== "ACTIVE" && (
            <button type="button" disabled={pending || r.errors.length > 0} className={btnPrimary} onClick={() => window.confirm(t("confirmActivate")) && run(() => activateSurveyAction(d.id))}>
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {t("activate")}
            </button>
          )}
          {d.status === "ACTIVE" && (
            <Link href="/cdp" className={btnSecondary}><ExternalLink className="size-4" aria-hidden="true" />{t("openDashboard")}</Link>
          )}
          {d.status !== "ACTIVE" && (
            <button type="button" disabled={pending} className={btnDanger} onClick={() => window.confirm(t("confirmDelete")) && run(() => deleteSurveyAction(d.id))}>
              <Trash2 className="size-4" aria-hidden="true" />
              {t("delete")}
            </button>
          )}
          {msg?.message && <p role="status" className={msg.ok ? "text-emerald-700" : "text-red-600"}>{t(msg.message)}</p>}
        </div>
      </div>
    </details>
  );
}

function refLabel(label: string, t: ReturnType<typeof useTranslations>) {
  if (label === "total") return t("refTotal");
  if (label.startsWith("dept:")) return label.slice(5);
  const [q, k] = label.split(":");
  return `${q} ${t(`answer_${k}`)}`;
}
