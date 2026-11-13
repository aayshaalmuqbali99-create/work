import { readStored } from "@/lib/storage";
import { db } from "@/lib/db";
import { getFacUser } from "@/features/facility/server/session";
import { can } from "@/features/facility/domain/permissions";

/** Floor plans are internal: signed-in users see published maps; administrators also see drafts. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getFacUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const map = await db.facFloorMap.findUnique({ where: { id } });
  if (!map || (map.status !== "PUBLISHED" && !can(user.role, "config.manage"))) return new Response("Not found", { status: 404 });
  const data = await readStored(map.storageKey);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": map.contentType,
      "Cache-Control": "private, max-age=600",
      "X-Content-Type-Options": "nosniff",
      // An SVG opened directly can never run scripts or load anything.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
    },
  });
}
