"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function MainNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="CDP" className="-mx-1 flex gap-1 overflow-x-auto">
      {items.map((i) => {
        const active = i.href === "/" ? pathname === "/" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition",
              active ? "border-teal font-bold text-navy" : "border-transparent text-muted hover:text-navy",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
