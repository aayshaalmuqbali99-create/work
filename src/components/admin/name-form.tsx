"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateMyNameAction } from "@/features/admin/auth-actions";
import { btnPrimary, inputCls } from "./ui";

export function NameForm({ name }: { name: string }) {
  const t = useTranslations("Admin");
  const [value, setValue] = useState(name);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex max-w-md flex-wrap items-end gap-2">
      <label className="flex-1 text-sm font-medium text-navy">
        {t("name")}
        <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={120} className={`${inputCls} mt-1`} />
      </label>
      <button type="button" disabled={pending || value.trim().length < 2} className={btnPrimary} onClick={() => start(async () => { const r = await updateMyNameAction(value); setMsg({ ok: r.ok, text: t(r.message ?? "saved") }); })}>
        {t("save")}
      </button>
      {msg && <p role="status" className={msg.ok ? "w-full text-sm text-emerald-700" : "w-full text-sm text-red-600"}>{msg.text}</p>}
    </div>
  );
}
