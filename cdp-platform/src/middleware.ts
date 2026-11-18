import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE } from "./lib/auth/constants";

const intl = createMiddleware(routing);

/**
 * Internal platform: every page needs a sign-in except the login page.
 * This redirect is only a convenience — every page and server action checks the session on the server.
 */
export default function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const m = pathname.match(/^\/(ar|en)(\/.*)?$/);
  if (m && !(m[2] ?? "").startsWith("/login") && !req.cookies.has(SESSION_COOKIE)) {
    const url = new URL(`/${m[1]}/login`, req.url);
    const rest = (m[2] ?? "/") + search;
    if (rest !== "/") url.searchParams.set("next", rest);
    return NextResponse.redirect(url);
  }
  return intl(req);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|brand|fonts|.*\\..*).*)",
};
