"use client";

import { startTransition, useActionState } from "react";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import { loginAction } from "@/features/admin/auth-actions";
import { btnPrimary, Field, inputCls } from "./ui";

export function LoginForm() {
  const t = useTranslations("Admin");
  const [state, action, pending] = useActionState(loginAction, { ok: false });
  return (
    <form
      className="space-y-4"
      // Submit manually so a failed attempt keeps the e-mail the user typed.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <Field label={t("email")} htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="username" required dir="ltr" className={inputCls} />
      </Field>
      <Field label={t("password")} htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" className={inputCls} />
      </Field>
      {state.message && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.message, { seconds: state.fieldErrors?.seconds ?? "" })}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        <LogIn className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("login")}
      </button>
    </form>
  );
}
