import "server-only";
import type { Role } from "@prisma/client";
import { getCurrentUser, type SessionUser } from "./session";

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
  }
}

const RANK: Record<Role, number> = { VIEWER: 0, ADMIN: 1 };

/**
 * Server-side authorisation for every protected operation (pages AND server actions).
 * Never rely on hidden buttons or middleware alone.
 */
export async function requireUser(minRole: Role = "VIEWER"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  if (RANK[user.role] < RANK[minRole]) throw new AuthError("FORBIDDEN");
  return user;
}
