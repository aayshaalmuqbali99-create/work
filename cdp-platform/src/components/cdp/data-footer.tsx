"use client";

import { useTranslations } from "next-intl";
import { useFormat } from "./shared";

export function DataFooter({ fileName, updated }: { fileName: string; updated: string }) {
  const t = useTranslations("Cdp");
  const f = useFormat();
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-1 px-4 py-4 text-sm text-muted sm:px-6" data-testid="data-footer">
        <span>{t("dataUpdated")}: <strong className="font-medium text-ink">{f.date(updated)}</strong></span>
        <span>{t("sourceFile")}: <strong className="font-medium text-ink" dir="ltr">{fileName}</strong></span>
      </div>
    </footer>
  );
}
