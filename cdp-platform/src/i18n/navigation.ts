import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware Link / router helpers. Always use these instead of next/link in app code. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
