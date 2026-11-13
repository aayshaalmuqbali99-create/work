import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE } from "./lib/auth/constants";
import { ACCESS_COOKIE, accessToken } from "./lib/site-access";
import { FAC_SESSION_COOKIE } from "./features/facility/constants";

const intl = createMiddleware(routing);

/**
 * 0. APP_MODE=facility: only Facility Hub pages are reachable on this deployment.
 * 1. Optional private preview: when SITE_PASSWORD is set, visitors must enter it once (cookie, 30 days).
 *    The control panel keeps its own login and is not behind this password.
 * 2. Optimistic admin guard: no session cookie → admin login page (real checks run on the server).
 * 3. Locale routing (/ar, /en).
 */
export default async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // APP_MODE=facility: this deployment serves Omantel Facility Hub only (separate from the assets platform).
  if (process.env.APP_MODE === "facility" && !/^\/(ar|en)\/facility(\/|$)/.test(pathname)) {
    const loc = pathname.match(/^\/(ar|en)(\/|$)/)?.[1] ?? "ar";
    return NextResponse.redirect(new URL(`/${loc}/facility`, req.url));
  }
  const admin = pathname.match(/^\/(ar|en)\/admin(\/.*)?$/);
  // Facility Hub has its own sign-in (Microsoft Entra ID); pages that need a user are guarded here
  // optimistically and checked again on the server.
  const facility = pathname.match(/^\/(ar|en)\/facility(\/.*)?$/);
  if (facility) {
    const rest = facility[2] ?? "";
    const needsUser = /^\/(request|requests|map|ops|q)(\/|$)/.test(rest);
    const employeePage = /^\/(request|requests|map|q)(\/|$)/.test(rest);
    // open access: employee pages get a private guest identity instead of the sign-in page (the dashboard still needs sign-in)
    if (employeePage && !req.cookies.has(FAC_SESSION_COOKIE) && process.env.FAC_OPEN_ACCESS === "true") {
      const url = new URL("/api/facility/guest", req.url);
      url.searchParams.set("next", `/${facility[1]}/facility${rest}${search}`);
      return NextResponse.redirect(url);
    }
    if (needsUser && !req.cookies.has(FAC_SESSION_COOKIE)) {
      const url = new URL(`/${facility[1]}/facility/login`, req.url);
      url.searchParams.set("next", `/facility${rest}${search}`);
      return NextResponse.redirect(url);
    }
    return intl(req);
  }

  const sitePassword = process.env.SITE_PASSWORD;
  if (sitePassword && !admin) {
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
  return intl(req);
}

export const config = {
  // Everything except API routes, Next internals, uploaded media and files with an extension.
  matcher: "/((?!api|_next|_vercel|media|.*\\..*).*)",
};
