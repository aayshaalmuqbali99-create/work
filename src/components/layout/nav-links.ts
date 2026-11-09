/**
 * Primary navigation (icons are attached in site-header.tsx).
 * Only routes/anchors that exist are listed here.
 */
export const primaryNav = [
  { key: "home", href: "/" },
  { key: "equipment", href: "/equipment" },
  { key: "categories", href: "/#categories" },
  { key: "request", href: "/request" },
  { key: "about", href: "/about" },
] as const;
