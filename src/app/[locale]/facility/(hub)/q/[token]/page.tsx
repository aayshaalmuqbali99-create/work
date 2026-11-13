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
  const live = { active: true, archivedAt: null };
  const area = await db.facArea.findFirst({ where: { qrToken: token, ...live, floor: live }, select: { id: true } });
  const location = area ? null : await db.facLocation.findFirst({ where: { qrToken: token, ...live, floor: live }, select: { id: true, areaId: true } });
  if (!area && !location) notFound();
  const query: Record<string, string> = location ? (location.areaId ? { location: location.id, from: "qr" } : { from: "qr" }) : { area: area!.id, from: "qr" };
  redirect({ href: { pathname: "/facility/request", query }, locale: await getLocale() });
}
