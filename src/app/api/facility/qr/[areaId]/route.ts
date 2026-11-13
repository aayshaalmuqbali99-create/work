import { db } from "@/lib/db";
import { getFacUser } from "@/features/facility/server/session";
import { can } from "@/features/facility/domain/permissions";
import { qrSvg } from "@/features/facility/server/qr";

/** Downloadable QR code (SVG) for a location — administrators only. */
export async function GET(_req: Request, { params }: { params: Promise<{ areaId: string }> }) {
  const user = await getFacUser();
  if (!user || !can(user.role, "config.manage")) return new Response("Forbidden", { status: 403 });
  const { areaId } = await params;
  const area = await db.facArea.findUnique({ where: { id: areaId }, include: { floor: true } });
  if (!area) return new Response("Not found", { status: 404 });
  return new Response(await qrSvg(area.qrToken), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="qr-${area.floor.code}-${area.nameEn.replace(/[^\w-]+/g, "-").toLowerCase()}.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
