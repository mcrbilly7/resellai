"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scanner", label: "Scan" },
  { href: "/receipts", label: "Receipts" },
  { href: "/inventory", label: "Inventory" },
  { href: "/listings", label: "Listings" },
  { href: "/messages", label: "Messages" },
  { href: "/analytics", label: "Analytics" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/sourcing", label: "Sourcing" },
  { href: "/settings", label: "Settings" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <header className="md:hidden sticky top-0 z-20 bg-surface border-b border-border">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="h-7 w-7 rounded-md bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">
          AI
        </div>
        <span className="font-semibold">AI Reseller Pro</span>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 text-sm">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium ${
                active ? "bg-accent text-accent-foreground" : "bg-surface-muted text-foreground/70"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
