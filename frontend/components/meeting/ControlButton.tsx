"use client";

import { useState, type ReactNode } from "react";
import { ChevronUp } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { cn } from "@/lib/utils";

interface ControlButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
  /** "alert" = red pill (unread chat), "count" = plain number (participants). */
  badgeTone?: "alert" | "count";
  active?: boolean;
  /** Content of the ^ menu next to the button (device pickers, etc.). */
  menu?: (close: () => void) => ReactNode;
  className?: string;
  shortcut?: string;
}

/** Zoom toolbar button: icon above a small label, optional ^ dropdown. */
export function ControlButton({ icon, label, onClick, badge, badgeTone = "alert", active, menu, className, shortcut }: ControlButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={cn("relative flex items-stretch", className)}>
      <button
        type="button"
        onClick={onClick}
        title={shortcut ? `${label} (${shortcut})` : label}
        aria-label={badge ? `${label} (${badge})` : label}
        className={cn(
          "relative flex min-w-[56px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-room-muted transition-colors hover:bg-room-hover hover:text-white sm:min-w-[68px]",
          active && "text-white",
        )}
      >
        <span className="relative">
          {icon}
          {Boolean(badge) && (
            <span
              aria-hidden
              className={cn(
                "absolute -top-1.5 min-w-[16px] text-[10px] font-semibold leading-4 text-white",
                badgeTone === "alert" ? "-right-2.5 rounded-full bg-zoom-red px-1 text-center" : "-right-3 text-left",
              )}
            >
              {badge}
            </span>
          )}
        </span>
        <span className="whitespace-nowrap">{label}</span>
      </button>
      {menu && (
        <Popover
          open={menuOpen}
          onOpenChange={setMenuOpen}
          side="top"
          tone="dark"
          className="w-72"
          trigger={
            <button
              type="button"
              aria-label={`${label} options`}
              onClick={() => setMenuOpen(!menuOpen)}
              className="-ml-1 flex h-full items-start rounded-md px-0.5 pt-2 text-room-muted hover:bg-room-hover hover:text-white"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          }
        >
          {menu(() => setMenuOpen(false))}
        </Popover>
      )}
    </div>
  );
}
