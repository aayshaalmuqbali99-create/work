"use server";

import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { clientInfo } from "@/lib/request";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { createFacSession, destroyFacSession, getFacUser } from "../server/session";
import { facAudit } from "../server/audit";
import { devLoginEnabled } from "../server/config-flags";

export type LoginState = { error?: "failed" | "tooMany" | "disabled"; seconds?: number };

let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= hash("facility-hub-dummy-password"));

/** Safe internal redirect target (only /facility paths). */
function safeNext(next: unknown): string {
  const s = typeof next === "string" ? next : "";
  return /^\/facility(\/[\w\-/]*)?(\?[\w=&%\-.]*)?$/.test(s) ? s : "/facility";
}

/** Local development sign-in (disabled in production unless FAC_DEV_LOGIN=true). */
export async function devLoginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!devLoginEnabled()) return { error: "disabled" };
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: "failed" };
  const { email, password } = parsed.data;
  const { ip } = await clientInfo();
  const a = await rateLimit(`fac-login:ip:${ip}`, 20, 15 * 60_000);
  const b = await rateLimit(`fac-login:email:${email}`, 5, 15 * 60_000);
  if (!a.ok || !b.ok) return { error: "tooMany", seconds: Math.max(a.retryAfterSec, b.retryAfterSec) };
  const user = await db.facUser.findUnique({ where: { email } });
  const ok = await verify(user?.passwordHash ?? (await dummyHash()), password).catch(() => false);
  if (!user || !user.active || !user.passwordHash || !ok) {
    await facAudit(null, "auth.login_failed", "user", user?.id, { email });
    return { error: "failed" };
  }
  await resetRateLimit(`fac-login:email:${email}`);
  await createFacSession(user.id);
  await facAudit(user, "auth.login", "user", user.id, { method: "dev" });
  const locale = await getLocale();
  const target = user.role === "EMPLOYEE" ? safeNext(form.get("next")) : safeNext(form.get("next") || "/facility/ops");
  redirect({ href: target, locale });
  return {};
}

export async function facLogoutAction() {
  const user = await getFacUser();
  await destroyFacSession();
  if (user) await facAudit(user, "auth.logout", "user", user.id);
  redirect({ href: "/facility", locale: await getLocale() });
}

/** Remember the preferred language so e-mails arrive in it. */
export async function setFacLocaleAction(locale: string) {
  const user = await getFacUser();
  if (user && (locale === "ar" || locale === "en") && user.locale !== locale) await db.facUser.update({ where: { id: user.id }, data: { locale } });
}
