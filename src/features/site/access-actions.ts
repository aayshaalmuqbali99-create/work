"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clientInfo } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { ACCESS_COOKIE, accessToken } from "@/lib/site-access";
import type { FormState } from "@/features/admin/schemas";

export async function unlockSiteAction(_prev: FormState, form: FormData): Promise<FormState> {
  const expected = process.env.SITE_PASSWORD;
  const locale = form.get("locale") === "en" ? "en" : "ar";
  const nextRaw = String(form.get("next") || "");
  const next = new RegExp(`^/${locale}(/[^/].*)?$`).test(nextRaw) && !nextRaw.includes("//") ? nextRaw : `/${locale}`;
  if (!expected) redirect(next);

  const { ip } = await clientInfo();
  const limited = await rateLimit(`site-access:${ip}`, 10, 15 * 60_000);
  if (!limited.ok) return { ok: false, message: "tooMany", fieldErrors: { seconds: String(limited.retryAfterSec) } };

  const given = Buffer.from(String(form.get("password") ?? ""));
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return { ok: false, message: "wrong" };

  (await cookies()).set(ACCESS_COOKIE, await accessToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
  redirect(next);
}
