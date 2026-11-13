import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import type { FacRole } from "@prisma/client";
import { db } from "@/lib/db";
import { clientInfo } from "@/lib/request";
import { FAC_SESSION_COOKIE } from "../constants";

const SESSION_HOURS = 12; // a working day; SSO re-authenticates silently
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type FacUserSession = {
  id: string;
  email: string;
  name: string;
  role: FacRole;
  phone: string;
  department: string;
  teamId: string | null;
  locale: string;
};

export async function createFacSession(userId: string, hours = SESSION_HOURS) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + hours * 36e5);
  const { ip, userAgent } = await clientInfo();
  await db.facSession.create({ data: { id: hashToken(token), userId, expiresAt, ip, userAgent } });
  (await cookies()).set(FAC_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  await db.facUser.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

export async function destroyFacSession() {
  const jar = await cookies();
  const token = jar.get(FAC_SESSION_COOKIE)?.value;
  if (token) await db.facSession.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(FAC_SESSION_COOKIE);
}

/** Current Facility Hub user or null. Cached per request. */
export const getFacUser = cache(async (): Promise<FacUserSession | null> => {
  const token = (await cookies()).get(FAC_SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await db.facSession.findUnique({ where: { id: hashToken(token) }, include: { user: true } });
  if (!s || s.expiresAt < new Date() || !s.user.active) return null;
  const u = s.user;
  return { id: u.id, email: u.email, name: u.name, role: u.role, phone: u.phone, department: u.department, teamId: u.teamId, locale: u.locale };
});
