"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/scanner", label: "AI Scanner", icon: "▦" },
  { href: "/receipts", label: "Receipts", icon: "🧾" },
  { href: "/inventory", label: "Inventory", icon: "▤" },
  { href: "/listings", label: "Listings", icon: "≡" },
  { href: "/messages", label: "Messages", icon: "✉" },
  { href: "/analytics", label: "Analytics", icon: "≡" },
  { href: "/marketplace", label: "Marketplace", icon: "⇄" },
  { href: "/sourcing", label: "Sourcing", icon: "⚲" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setEmail(d.user?.email ?? null))
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center font-bold">
            AI
          </div>
          <div>
            <div className="font-semibold leading-tight">AI Reseller Pro</div>
            <div className="text-xs text-muted leading-tight">Reselling OS</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground/80 hover:bg-surface-muted"
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-3 border-t border-border space-y-1">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-muted"
        >
          <span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
          <span>{theme === "dark" ? "☾" : "☀"}</span>
        </button>
        {email && (
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-xs text-muted truncate" title={email}>
              {email}
            </span>
            <button onClick={logout} className="text-xs font-medium text-accent hover:underline shrink-0">
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
