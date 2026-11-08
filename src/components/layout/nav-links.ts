/**
 * Primary navigation. Phase 8 moves this into the database (NavigationItem) so the admin
 * can add, edit and reorder links; only routes/anchors that exist are listed here.
 */
export const primaryNav = [
  { key: "home", href: "/" },
  { key: "categories", href: "/#categories" },
  { key: "why", href: "/#why" },
  { key: "about", href: "/about" },
] as const;
