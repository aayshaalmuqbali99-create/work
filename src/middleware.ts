import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE } from "./lib/auth/constants";
import { ACCESS_COOKIE, accessToken } from "./lib/site-access";

const intl = createMiddleware(routing);

/**
 * 1. Optional private preview: when SITE_PASSWORD is set, visitors must enter it once (cookie, 30 days).
 *    The control panel keeps its own login and is not behind this password.
 * 2. Optimistic admin guard: no session cookie → admin login page (real checks run on the server).
 * 3. Same for the internal CDP results platform (/cdp).
 * 4. Locale routing (/ar, /en).
 */
export default async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const admin = pathname.match(/^\/(ar|en)\/admin(\/.*)?$/);
  const cdp = pathname.match(/^\/(ar|en)\/cdp(\/.*)?$/);

  const sitePassword = process.env.SITE_PASSWORD;
  if (sitePassword && !admin && !cdp) {
    const loc = pathname.match(/^\/(ar|en)(\/|$)/)?.[1];
    const isAccessPage = /^\/(ar|en)\/access\/?$/.test(pathname);
    if (loc && !isAccessPage && req.cookies.get(ACCESS_COOKIE)?.value !== (await accessToken(sitePassword))) {
      const url = new URL(`/${loc}/access`, req.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
  }

  if (admin && !(admin[2] ?? "").startsWith("/login") && !req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL(`/${admin[1]}/admin/login`, req.url));
  }
  // CDP results platform: internal, sign-in required (real checks run on the server).
  if (cdp && !req.cookies.has(SESSION_COOKIE)) {
    const url = new URL(`/${cdp[1]}/admin/login`, req.url);
    url.searchParams.set("next", pathname.slice(3) + search);
    return NextResponse.redirect(url);
  }
  return intl(req);
}

export const config = {
  // Everything except API routes, Next internals, uploaded media and files with an extension.
  matcher: "/((?!api|_next|_vercel|media|.*\\..*).*)",
};
