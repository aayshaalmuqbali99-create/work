import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site-url";
import { rateLimit } from "@/lib/rate-limit";
import { clientInfo } from "@/lib/request";
import { createFacSession, getFacUser } from "@/features/facility/server/session";
import { openAccess } from "@/features/facility/server/config-flags";
import { GUEST_DOMAIN } from "@/features/facility/server/notify";

/**
 * Open access: gives this browser its own private guest identity (30 days) and returns to the page.
 * Guests can only report and follow their own requests; the dashboard still requires sign-in.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("next") ?? "";
  const next = /^\/(ar|en)\/facility(\/[\w\-/]*)?(\?[\w=&%\-.]*)?$/.test(raw) ? raw : "/ar/facility";
  const locale = next.startsWith("/en") ? "en" : "ar";
  if (!openAccess()) return NextResponse.redirect(new URL(`/${locale}/facility/login`, SITE_URL));
  if (!(await getFacUser())) {
    const { ip } = await clientInfo();
    if (!(await rateLimit(`fac-guest:${ip}`, 60, 60 * 60_000)).ok) return new NextResponse("Too many requests", { status: 429 });
    const id = randomBytes(6).toString("hex");
    const user = await db.facUser.create({
      data: { email: `guest-${id}${GUEST_DOMAIN}`, name: locale === "ar" ? `زائر ${id.slice(0, 4)}` : `Guest ${id.slice(0, 4)}`, role: "EMPLOYEE", locale },
    });
    await createFacSession(user.id, 24 * 30);
  }
  return NextResponse.redirect(new URL(next, SITE_URL));
}
