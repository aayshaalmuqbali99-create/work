import { createHash } from "node:crypto";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { TokenAction } from "@/components/facility/token-action";

/** Landing page for "Yes, it's fixed" / "Reopen" links in e-mails. Nothing changes until the employee presses the button. */
export default async function ActionPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ t?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const token = (await searchParams).t ?? "";
  const t = await getTranslations("Fac.Action");
  const row = token.length >= 20 && token.length <= 64 ? await db.facActionToken.findUnique({ where: { id: createHash("sha256").update(token).digest("hex") } }) : null;
  const valid = row && !row.usedAt && row.expiresAt > new Date();
  return (
    <div className="px-5 pb-10 pt-36">
      <div className="mx-auto max-w-lg rounded-[32px] border border-fline bg-white p-8 shadow-lift">
        {valid ? <TokenAction token={token} purpose={row.purpose === "REOPEN" ? "REOPEN" : "CONFIRM"} /> : <p role="alert" className="text-center text-lg font-semibold text-fink">{t("expired")}</p>}
      </div>
    </div>
  );
}
