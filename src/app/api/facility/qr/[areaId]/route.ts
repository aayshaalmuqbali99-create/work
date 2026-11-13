import { db } from "@/lib/db";
import { getFacUser } from "@/features/facility/server/session";
import { can } from "@/features/facility/domain/permissions";
import { qrSvg } from "@/features/facility/server/qr";

/** Downloadable QR code (SVG) for a location — administrators only. */
export async function GET(req: Request, { params }: { params: Promise<{ areaId: string }> }) {
  const user = await getFacUser();
  if (!user || !can(user.role, "config.manage")) return new Response("Forbidden", { status: 403 });
  const { areaId } = await params;
  const isLocation = new URL(req.url).searchParams.get("type") === "location";
  const area = isLocation
    ? await db.facLocation.findUnique({ where: { id: areaId }, include: { floor: true } }).then((l) => (l ? { ...l, nameEn: [l.nameEn || l.kind, l.code].filter(Boolean).join(" ") } : null))
    : await db.facArea.findUnique({ where: { id: areaId }, include: { floor: true } });
  if (!area) return new Response("Not found", { status: 404 });
  return new Response(await qrSvg(area.qrToken), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="qr-${area.floor.code}-${area.nameEn.replace(/[^\w-]+/g, "-").toLowerCase()}.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
