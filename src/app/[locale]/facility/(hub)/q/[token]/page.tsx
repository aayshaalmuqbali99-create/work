import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireFacPage } from "@/features/facility/server/guard";

/** Location QR code target: resolves the random token and opens the request form with the area selected. */
export default async function QrPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await requireFacPage("request.create", `/facility/q/${token}`);
  if (!/^[a-z0-9]{10,40}$/i.test(token)) notFound();
  const area = await db.facArea.findFirst({ where: { qrToken: token, active: true, floor: { active: true } }, select: { id: true } });
  if (!area) notFound();
  redirect({ href: { pathname: "/facility/request", query: { area: area.id, from: "qr" } }, locale: await getLocale() });
}
