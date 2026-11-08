"use server";

import { revalidatePath } from "next/cache";
import { hash } from "@node-rs/argon2";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { fieldErrors, newUserSchema, type FormState } from "./schemas";

const PATH = "/[locale]/admin/(panel)/users";

export async function createUserAction(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireUser("ADMIN");
  const parsed = newUserSchema.safeParse({ name: form.get("name"), email: form.get("email"), role: form.get("role"), password: form.get("password") });
  if (!parsed.success) return { ok: false, message: "fixErrors", fieldErrors: fieldErrors(parsed.error) };
  const { password, ...rest } = parsed.data;
  if (await db.user.findUnique({ where: { email: rest.email } })) return { ok: false, message: "fixErrors", fieldErrors: { email: "emailTaken" } };
  const user = await db.user.create({ data: { ...rest, passwordHash: await hash(password) } });
  await audit({ userId: me.id, action: "user.create", entity: "user", entityId: user.id, after: rest });
  revalidatePath(PATH, "page");
  return { ok: true, message: "userCreated", at: Date.now() };
}

/** Guard rails: never lock everyone out, and never change your own role/status from the list. */
async function guardTarget(meId: string, targetId: string, next: { role?: Role; active?: boolean }) {
  if (meId === targetId) return "notSelf";
  const target = await db.user.findUnique({ where: { id: targetId } });
  if (!target) return "notFound";
  const losesAdmin = target.role === "ADMIN" && target.active && (next.role === "EDITOR" || next.active === false);
  if (losesAdmin && (await db.user.count({ where: { role: "ADMIN", active: true } })) <= 1) return "lastAdmin";
  return null;
}

export async function setUserActiveAction(id: string, active: boolean): Promise<FormState> {
  const me = await requireUser("ADMIN");
  const err = await guardTarget(me.id, id, { active });
  if (err) return { ok: false, message: err };
  await db.$transaction([db.user.update({ where: { id }, data: { active } }), ...(active ? [] : [db.session.deleteMany({ where: { userId: id } })])]);
  await audit({ userId: me.id, action: "user.active", entity: "user", entityId: id, after: { active } });
  revalidatePath(PATH, "page");
  return { ok: true, at: Date.now() };
}

export async function setUserRoleAction(id: string, role: Role): Promise<FormState> {
  const me = await requireUser("ADMIN");
  const err = await guardTarget(me.id, id, { role });
  if (err) return { ok: false, message: err };
  await db.user.update({ where: { id }, data: { role } });
  await audit({ userId: me.id, action: "user.role", entity: "user", entityId: id, after: { role } });
  revalidatePath(PATH, "page");
  return { ok: true, at: Date.now() };
}

export async function resetUserPasswordAction(id: string, password: string): Promise<FormState> {
  const me = await requireUser("ADMIN");
  if (typeof password !== "string" || password.length < 12 || password.length > 200) return { ok: false, message: "passwordRules" };
  if (!(await db.user.findUnique({ where: { id } }))) return { ok: false, message: "notFound" };
  await db.$transaction([
    db.user.update({ where: { id }, data: { passwordHash: await hash(password) } }),
    db.session.deleteMany({ where: { userId: id } }),
  ]);
  await audit({ userId: me.id, action: "user.password_reset", entity: "user", entityId: id });
  return { ok: true, message: "resetDone", at: Date.now() };
}
