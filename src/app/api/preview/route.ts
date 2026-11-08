import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Turn website preview (Next.js draft mode) on or off. Only signed-in editors can turn it on;
 * even with the cookie, draft content is only served to signed-in users (see getSiteContent).
 * GET /api/preview?on=1&to=/ar   |   GET /api/preview?on=0&to=/ar
 */
export async function GET(req: NextRequest) {
  const on = req.nextUrl.searchParams.get("on") === "1";
  const to = req.nextUrl.searchParams.get("to") || "/";
  const safeTo = /^\/(ar|en)(\/[^/].*|\/?)$/.test(to) ? to : "/";
  const dm = await draftMode();
  if (on) {
    if (!(await getCurrentUser())) return new NextResponse("Unauthorized", { status: 401 });
    dm.enable();
  } else {
    dm.disable();
  }
  return NextResponse.redirect(new URL(safeTo, req.url));
}
