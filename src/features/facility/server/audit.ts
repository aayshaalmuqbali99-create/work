import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { clientInfo } from "@/lib/request";

export async function facAudit(
  user: { id: string; name: string } | null,
  action: string,
  entity: string,
  entityId?: string | null,
  data?: Prisma.InputJsonValue,
) {
  let ip: string | null = null;
  try {
    ip = (await clientInfo()).ip;
  } catch {
    /* outside a request (jobs) */
  }
  await db.facAudit.create({ data: { userId: user?.id ?? null, userName: user?.name ?? "system", action, entity, entityId: entityId ?? null, data, ip } });
}
