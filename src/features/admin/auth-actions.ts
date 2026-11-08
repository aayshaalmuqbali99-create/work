"use server";

import { hash, verify } from "@node-rs/argon2";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientInfo } from "@/lib/request";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/guard";
import { fieldErrors, loginSchema, passwordSchema, type FormState } from "./schemas";

// When the e-mail is unknown we still run one Argon2 verification so response time does not reveal it.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hash("labsouq-dummy-password-never-used"));

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { ok: false, message: "loginFailed" };
  const { email, password } = parsed.data;
  const { ip } = await clientInfo();

  const byIp = rateLimit(`login:ip:${ip}`, 20, 15 * 60_000);
  const byEmail = rateLimit(`login:email:${email}`, 5, 15 * 60_000);
  if (!byIp.ok || !byEmail.ok) {
    return { ok: false, message: "tooMany", fieldErrors: { seconds: String(Math.max(byIp.retryAfterSec, byEmail.retryAfterSec)) } };
  }

  const user = await db.user.findUnique({ where: { email } });
  const valid = await verify(user?.passwordHash ?? (await getDummyHash()), password).catch(() => false);
  if (!user || !user.active || !valid) {
    await audit({ userId: null, action: "auth.login_failed", entity: "user", entityId: user?.id ?? null, after: { email } });
    return { ok: false, message: "loginFailed" };
  }
  resetRateLimit(`login:email:${email}`);
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ userId: user.id, action: "auth.login", entity: "user", entityId: user.id });
  redirect({ href: "/admin", locale: await getLocale() });
  return { ok: true };
}

export async function logoutAction() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit({ userId: user.id, action: "auth.logout", entity: "user", entityId: user.id });
  redirect({ href: "/admin/login", locale: await getLocale() });
}

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireUser();
  const parsed = passwordSchema.safeParse({ current: form.get("current"), next: form.get("next"), confirm: form.get("confirm") });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const limited = rateLimit(`pw:${me.id}`, 5, 15 * 60_000);
  if (!limited.ok) return { ok: false, message: "tooMany", fieldErrors: { seconds: String(limited.retryAfterSec) } };
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verify(user.passwordHash, parsed.data.current).catch(() => false))) {
    return { ok: false, fieldErrors: { current: "passwordWrong" } };
  }
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hash(parsed.data.next) } });
  // sign out every other session, keep this one by recreating it
  await db.session.deleteMany({ where: { userId: me.id } });
  await createSession(me.id);
  await audit({ userId: me.id, action: "auth.password_changed", entity: "user", entityId: me.id });
  return { ok: true, message: "passwordChanged", at: Date.now() };
}
