import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE } from "./lib/auth/constants";

const intl = createMiddleware(routing);

/**
 * 1. Optimistic guard: no session cookie → straight to the admin login page.
 *    (Real authorisation happens on the server in every admin page and server action.)
 * 2. Locale routing (/ar, /en).
 */
export default function middleware(req: NextRequest) {
  const m = req.nextUrl.pathname.match(/^\/(ar|en)\/admin(\/.*)?$/);
  if (m && !(m[2] ?? "").startsWith("/login") && !req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL(`/${m[1]}/admin/login`, req.url));
  }
  return intl(req);
}

export const config = {
  // Everything except API routes, Next internals, uploaded media and files with an extension.
  matcher: "/((?!api|_next|_vercel|media|.*\\..*).*)",
};
