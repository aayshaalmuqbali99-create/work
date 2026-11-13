import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { can, type Permission } from "../domain/permissions";
import { getFacUser, type FacUserSession } from "./session";
import { isGuestEmail } from "./notify";

export class FacAuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
  }
}

/** For server actions: throws when not signed in / not allowed. */
export async function requireFac(permission?: Permission): Promise<FacUserSession> {
  const user = await getFacUser();
  if (!user) throw new FacAuthError("UNAUTHENTICATED");
  if (permission && !can(user.role, permission)) throw new FacAuthError("FORBIDDEN");
  return user;
}

/** For pages: redirects to sign-in (or the hub home when signed in without permission). */
export async function requireFacPage(permission?: Permission, next?: string): Promise<FacUserSession> {
  const user = await getFacUser();
  const locale = await getLocale();
  if (!user) {
    redirect({ href: { pathname: "/facility/login", query: next ? { next } : {} }, locale });
    throw new Error("unreachable");
  }
  if (permission && !can(user.role, permission)) {
    // A guest visitor (QR / open access) is sent to the team sign-in instead of being bounced home.
    if (isGuestEmail(user.email)) redirect({ href: { pathname: "/facility/login", query: next ? { next } : {} }, locale });
    redirect({ href: "/facility", locale });
    throw new Error("unreachable");
  }
  return user;
}

/** Standard result for actions. */
export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fields?: Record<string, string> };

export function actionError(e: unknown): ActionResult<never> {
  if (e instanceof FacAuthError) return { ok: false, error: e.code === "FORBIDDEN" ? "forbidden" : "unauthenticated" };
  console.error("[facility]", e);
  return { ok: false, error: "error" };
}
