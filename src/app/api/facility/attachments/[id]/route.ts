import { readStored } from "@/lib/storage";
import { db } from "@/lib/db";
import { getFacUser } from "@/features/facility/server/session";
import { visibleWhere } from "@/features/facility/server/queries";

/** Request photos are private: only people allowed to see the request can load them. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getFacUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const att = await db.facAttachment.findFirst({ where: { id, request: visibleWhere(user) }, select: { storageKey: true } });
  const data = att ? await readStored(att.storageKey) : null;
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
