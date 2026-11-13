import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { SITE_URL } from "@/lib/site-url";
import { entraEnabled } from "@/features/facility/server/config-flags";

const OIDC_COOKIE = "fh_oidc";

/** Starts Microsoft Entra ID sign-in (authorization code flow with PKCE). */
export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  if (!entraEnabled()) return NextResponse.redirect(new URL(`/${locale}/facility/login?error=sso`, SITE_URL));
  const next = req.nextUrl.searchParams.get("next") ?? "";
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const url = new URL(`https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}/oauth2/v2.0/authorize`);
  url.search = new URLSearchParams({
    client_id: process.env.ENTRA_CLIENT_ID!,
    response_type: "code",
    redirect_uri: `${SITE_URL}/api/facility/auth/entra/callback`,
    response_mode: "query",
    scope: "openid profile email User.Read",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set(OIDC_COOKIE, JSON.stringify({ state, verifier, next, locale }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/facility/auth",
    maxAge: 600,
  });
  return res;
}
