import { NextResponse, type NextRequest } from "next/server";
import { SITE_URL } from "@/lib/site-url";
import { db } from "@/lib/db";
import { createFacSession } from "@/features/facility/server/session";
import { facAudit } from "@/features/facility/server/audit";
import { entraEnabled } from "@/features/facility/server/config-flags";

const OIDC_COOKIE = "fh_oidc";

/**
 * Completes Microsoft Entra ID sign-in: exchanges the code (PKCE + client secret), reads the profile from
 * Microsoft Graph with the user's token, and creates/links the Facility Hub user. New users are EMPLOYEE;
 * Facility Operations roles are granted in the dashboard.
 */
export async function GET(req: NextRequest) {
  const raw = req.cookies.get(OIDC_COOKIE)?.value;
  let saved: { state: string; verifier: string; next: string; locale: string } | null = null;
  try {
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    saved = null;
  }
  const locale = saved?.locale === "en" ? "en" : "ar";
  const fail = (reason: string) => {
    console.warn("[facility-sso]", reason);
    const res = NextResponse.redirect(new URL(`/${locale}/facility/login?error=sso`, SITE_URL));
    res.cookies.delete({ name: OIDC_COOKIE, path: "/api/facility/auth" });
    return res;
  };
  if (!entraEnabled() || !saved) return fail("no state");
  const code = req.nextUrl.searchParams.get("code");
  if (!code || req.nextUrl.searchParams.get("state") !== saved.state) return fail("state mismatch");

  const tokenRes = await fetch(`https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.ENTRA_CLIENT_ID!,
      client_secret: process.env.ENTRA_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${SITE_URL}/api/facility/auth/entra/callback`,
      code_verifier: saved.verifier,
      scope: "openid profile email User.Read",
    }),
  });
  if (!tokenRes.ok) return fail(`token ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName,mobilePhone,businessPhones,department", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!meRes.ok) return fail(`graph ${meRes.status}`);
  const me = (await meRes.json()) as { id: string; displayName?: string; mail?: string; userPrincipalName?: string; mobilePhone?: string; businessPhones?: string[]; department?: string };
  const email = (me.mail || me.userPrincipalName || "").toLowerCase();
  if (!me.id || !email) return fail("no identity");
  const allowed = (process.env.ENTRA_ALLOWED_DOMAINS ?? "").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.some((d) => email.endsWith(`@${d}`))) return fail("domain not allowed");

  const existing = (await db.facUser.findUnique({ where: { entraOid: me.id } })) ?? (await db.facUser.findUnique({ where: { email } }));
  const profile = {
    name: me.displayName || email,
    email,
    department: me.department ?? "",
    phone: me.mobilePhone || me.businessPhones?.[0] || "",
  };
  const user = existing
    ? await db.facUser.update({ where: { id: existing.id }, data: { ...profile, entraOid: me.id, phone: existing.phone || profile.phone } })
    : await db.facUser.create({ data: { ...profile, entraOid: me.id, locale } });
  if (!user.active) return fail("inactive");

  await createFacSession(user.id);
  await facAudit(user, "auth.login", "user", user.id, { method: "entra" });
  const next = /^\/facility(\/[\w\-/]*)?(\?[\w=&%\-.]*)?$/.test(saved.next) ? saved.next : user.role === "EMPLOYEE" ? "/facility" : "/facility/ops";
  const res = NextResponse.redirect(new URL(`/${locale}${next}`, SITE_URL));
  res.cookies.delete({ name: OIDC_COOKIE, path: "/api/facility/auth" });
  return res;
}
