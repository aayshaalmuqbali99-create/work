"use client";

import { startTransition, useActionState } from "react";
import { useTranslations } from "next-intl";
import { LockKeyhole } from "lucide-react";
import { unlockSiteAction } from "@/features/site/access-actions";

export function AccessForm({ locale, next }: { locale: string; next: string }) {
  const t = useTranslations("Access");
  const [state, action, pending] = useActionState(unlockSiteAction, { ok: false });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <label htmlFor="site-password" className="block text-sm font-medium text-navy">{t("password")}</label>
      <input
        id="site-password"
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        dir="ltr"
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
      />
      {state.message && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.message, { seconds: state.fieldErrors?.seconds ?? "" })}
        </p>
      )}
      <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal disabled:opacity-60">
        <LockKeyhole className="size-4" aria-hidden="true" />
        {t("enter")}
      </button>
    </form>
  );
}
