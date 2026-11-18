import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { clientInfo } from "./request";

/** Record who changed what. `before`/`after` hold only the changed fields. */
export async function audit(entry: {
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}) {
  const { ip } = await clientInfo();
  await db.auditLog.create({ data: { ...entry, ip } });
}
