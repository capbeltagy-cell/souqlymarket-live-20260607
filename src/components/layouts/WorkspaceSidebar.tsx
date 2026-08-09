import type { ComponentType } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type WorkspaceNavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export function WorkspaceSidebar({ items, label }: { items: WorkspaceNavItem[]; label: string }) {
  const location = useLocation();
  return (
    <aside className="rounded-2xl border border-border bg-card p-3 shadow-card lg:sticky lg:top-24">
      <p className="px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <nav className="grid gap-1" aria-label={label}>
        {items.map(({ href, icon: Icon, label: itemLabel }) => {
          const active = location.pathname === href || location.pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {itemLabel}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
