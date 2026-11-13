"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { devLoginAction, type LoginState } from "@/features/facility/actions/auth";
import { FieldLabel, fhBtn, fhInput } from "./ui";

export function DevLoginForm({ next }: { next: string }) {
  const t = useTranslations("Fac.Login");
  const [state, action, pending] = useActionState<LoginState, FormData>(devLoginAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div>
        <FieldLabel htmlFor="fh-email">{t("email")}</FieldLabel>
        <input id="fh-email" name="email" type="email" autoComplete="username" required dir="ltr" className={fhInput} aria-invalid={!!state.error} />
      </div>
      <div>
        <FieldLabel htmlFor="fh-password">{t("password")}</FieldLabel>
        <input id="fh-password" name="password" type="password" autoComplete="current-password" required dir="ltr" className={fhInput} aria-invalid={!!state.error} />
      </div>
      {state.error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error === "tooMany" ? t("tooMany", { seconds: state.seconds ?? 60 }) : t("failed")}
        </p>
      )}
      <button className={`${fhBtn.primary} w-full`} disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} {t("submit")}
      </button>
    </form>
  );
}
