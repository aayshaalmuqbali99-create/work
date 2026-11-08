"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { changePasswordAction } from "@/features/admin/auth-actions";
import { btnPrimary, Field, inputCls } from "./ui";

export function PasswordForm() {
  const t = useTranslations("Admin");
  const [state, action, pending] = useActionState(changePasswordAction, { ok: false });
  const err = (k: string) => (state.fieldErrors?.[k] ? t(state.fieldErrors[k]) : undefined);
  return (
    <form action={action} className="max-w-md space-y-4" key={state.at}>
      <Field label={t("currentPassword")} htmlFor="current" error={err("current")}>
        <input id="current" name="current" type="password" autoComplete="current-password" required dir="ltr" className={inputCls} aria-invalid={!!err("current")} />
      </Field>
      <Field label={t("newPassword")} htmlFor="next" help={t("passwordRules")} error={err("next")}>
        <input id="next" name="next" type="password" autoComplete="new-password" required minLength={12} dir="ltr" className={inputCls} aria-invalid={!!err("next")} />
      </Field>
      <Field label={t("confirmPassword")} htmlFor="confirm" error={err("confirm")}>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required dir="ltr" className={inputCls} aria-invalid={!!err("confirm")} />
      </Field>
      {state.message && (
        <p role="status" className={`rounded-xl px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {t(state.message, { seconds: state.fieldErrors?.seconds ?? "" })}
        </p>
      )}
      <button type="submit" disabled={pending} className={btnPrimary}>{t("changePassword")}</button>
    </form>
  );
}
