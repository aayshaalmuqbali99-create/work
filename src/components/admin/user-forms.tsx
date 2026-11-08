"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, UserPlus } from "lucide-react";
import type { Role } from "@prisma/client";
import { createUserAction, resetUserPasswordAction, setUserActiveAction, setUserRoleAction } from "@/features/admin/user-actions";
import type { FormState } from "@/features/admin/schemas";
import { btnDanger, btnPrimary, btnSecondary, Field, inputCls } from "./ui";

export function NewUserForm() {
  const t = useTranslations("Admin");
  const [state, action, pending] = useActionState<FormState, FormData>(createUserAction, { ok: false });
  const err = (k: string) => (state.fieldErrors?.[k] ? t(state.fieldErrors[k]) : undefined);
  return (
    <form
      key={state.ok ? state.at : "form"}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="grid gap-4 md:grid-cols-2"
    >
      <Field label={t("name")} htmlFor="u-name" error={err("name")}>
        <input id="u-name" name="name" required className={inputCls} aria-invalid={!!err("name")} />
      </Field>
      <Field label={t("email")} htmlFor="u-email" error={err("email")}>
        <input id="u-email" name="email" type="email" required dir="ltr" className={inputCls} aria-invalid={!!err("email")} />
      </Field>
      <Field label={t("role")} htmlFor="u-role">
        <select id="u-role" name="role" defaultValue="EDITOR" className={inputCls}>
          <option value="EDITOR">{t("role_EDITOR")}</option>
          <option value="ADMIN">{t("role_ADMIN")}</option>
        </select>
      </Field>
      <Field label={t("tempPassword")} htmlFor="u-password" help={t("tempPasswordHelp")} error={err("password")}>
        <input id="u-password" name="password" type="text" required minLength={12} autoComplete="off" dir="ltr" className={`${inputCls} font-mono`} aria-invalid={!!err("password")} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <button type="submit" disabled={pending} className={btnPrimary}><UserPlus className="size-4" />{t("createUser")}</button>
        {state.message && <p role="status" className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-600"}>{t(state.message)}</p>}
      </div>
    </form>
  );
}

export function UserRowActions({ id, role, active, isSelf }: { id: string; role: Role; active: boolean; isSelf: boolean }) {
  const t = useTranslations("Admin");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pw, setPw] = useState<string | null>(null);
  const run = (fn: () => Promise<FormState>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.message ? { ok: r.ok, text: t(r.message) } : null);
      if (r.ok) setPw(null);
    });
  if (isSelf) return <span className="text-xs text-muted">({t("you")})</span>;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" disabled={pending} className={btnSecondary} onClick={() => run(() => setUserRoleAction(id, role === "ADMIN" ? "EDITOR" : "ADMIN"))}>
          {role === "ADMIN" ? t("makeEditor") : t("makeAdmin")}
        </button>
        {active ? (
          <button type="button" disabled={pending} className={btnDanger} onClick={() => window.confirm(t("confirmDisable")) && run(() => setUserActiveAction(id, false))}>{t("disable")}</button>
        ) : (
          <button type="button" disabled={pending} className={btnSecondary} onClick={() => run(() => setUserActiveAction(id, true))}>{t("enable")}</button>
        )}
        <button type="button" disabled={pending} className={btnSecondary} onClick={() => setPw((v) => (v === null ? "" : null))}><KeyRound className="size-4" />{t("resetPassword")}</button>
      </div>
      {pw !== null && (
        <div className="flex flex-wrap gap-2">
          <input aria-label={t("tempPassword")} value={pw} onChange={(e) => setPw(e.target.value)} minLength={12} dir="ltr" className={`${inputCls} max-w-xs font-mono`} />
          <button type="button" disabled={pending || pw.length < 12} className={btnPrimary} onClick={() => run(() => resetUserPasswordAction(id, pw))}>{t("save")}</button>
        </div>
      )}
      {msg && <p role="status" className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-red-600"}>{msg.text}</p>}
    </div>
  );
}
