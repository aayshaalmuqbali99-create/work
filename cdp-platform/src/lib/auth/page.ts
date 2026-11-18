import "server-only";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import type { Role } from "@prisma/client";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "./session";

/** For pages: sign-in required; pages for admins send other users back to the results. */
export const requirePageUser = cache(async (minRole: Role = "VIEWER") => {
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale: await getLocale() });
  if (minRole === "ADMIN" && user!.role !== "ADMIN") redirect({ href: "/", locale: await getLocale() });
  return user!;
});
