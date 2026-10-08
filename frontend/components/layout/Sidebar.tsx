import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  title: string;
  items: SidebarItem[];
  activeKey: string;
}

/** Vertical section nav on desktop; horizontal scrollable tabs on mobile. */
export function Sidebar({ title, items, activeKey }: SidebarProps) {
  return (
    <aside className="border-b border-zoom-border bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <h1 className="hidden px-5 pb-2 pt-6 text-lg font-semibold md:block">{title}</h1>
      <nav className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-col md:px-3" aria-label={title}>
        {items.map(({ key, label, href, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            aria-current={key === activeKey ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              key === activeKey ? "bg-zoom-blue-light text-zoom-blue" : "text-zoom-text hover:bg-zoom-bg",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
