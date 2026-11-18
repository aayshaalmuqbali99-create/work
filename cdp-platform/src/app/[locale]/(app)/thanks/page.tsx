import { getTranslations, setRequestLocale } from "next-intl/server";
import { Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/lib/auth/page";
import { getThanksBoard } from "@/features/cdp/data";
import { ThanksBoardView } from "@/components/cdp/thanks-board";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Cdp" });
  return { title: { absolute: t("boardTitle") }, robots: { index: false, follow: false } };
}

export default async function ThanksBoardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageUser();
  const board = await getThanksBoard(user);
  const t = await getTranslations("Cdp");
  if (!board)
    return (
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center">
        <Lock className="mx-auto size-10 text-muted" aria-hidden="true" />
        <p className="mt-3 font-semibold text-navy">{t("boardNotPublished")}</p>
        <Link href="/" className="mt-4 inline-block text-navy underline">{t("backToResults")}</Link>
      </main>
    );
  return <ThanksBoardView board={board} />;
}
