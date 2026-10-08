"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Home, MessageSquare, PenSquare, Search, Settings, Video, type LucideIcon } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";

interface NavTab {
  label: string;
  icon: LucideIcon;
  href?: string; // tabs without href are placeholders
}

const TABS: NavTab[] = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Meetings", icon: Video, href: "/meetings" },
  { label: "Team Chat", icon: MessageSquare },
  { label: "Whiteboards", icon: PenSquare },
];

const tabClass = (active: boolean) =>
  cn(
    "flex h-full flex-col items-center justify-center gap-0.5 border-b-2 px-3 text-[11px] font-medium transition-colors sm:px-4",
    active ? "border-zoom-blue text-zoom-blue" : "border-transparent text-zoom-muted hover:text-zoom-text",
  );

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    router.push(`/meetings?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zoom-border bg-white">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <Logo />
        <form onSubmit={onSearch} className="relative ml-2 hidden w-56 md:block lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zoom-muted" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search meetings"
            aria-label="Search meetings"
            className="h-9 w-full rounded-lg bg-zoom-bg pl-9 pr-3 text-sm outline-none ring-zoom-blue/30 focus:bg-white focus:ring-2"
          />
        </form>

        <nav className="mx-auto flex h-full items-stretch" aria-label="Main">
          {TABS.map(({ label, icon: Icon, href }) => {
            const content = (
              <>
                <Icon className="h-5 w-5" aria-hidden />
                <span className="hidden sm:block">{label}</span>
              </>
            );
            return href ? (
              <Link key={label} href={href} className={tabClass(pathname === href)} aria-current={pathname === href ? "page" : undefined}>
                {content}
              </Link>
            ) : (
              <button key={label} type="button" className={tabClass(false)} onClick={() => toast(`${label} isn't part of this demo`)}>
                {content}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Settings"
            onClick={() => toast("Settings aren't part of this demo")}
            className="hidden rounded-lg p-2 text-zoom-muted hover:bg-zoom-bg hover:text-zoom-text sm:block"
          >
            <Settings className="h-5 w-5" />
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
