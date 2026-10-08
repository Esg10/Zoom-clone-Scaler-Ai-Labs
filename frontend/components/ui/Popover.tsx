"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { useDismiss } from "@/hooks/useDismiss";
import { cn } from "@/lib/utils";

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  tone?: "light" | "dark";
  className?: string;
}

const ALIGN = { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" };

/** Anchored floating panel that closes on outside click or Escape. */
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  side = "bottom",
  align = "start",
  tone = "light",
  className,
}: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  useDismiss(ref, close, open);

  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div
          role="dialog"
          className={cn(
            "absolute z-50 min-w-[200px] animate-fade-in rounded-xl p-1.5 shadow-popover",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
            ALIGN[align],
            tone === "dark"
              ? "border border-room-border bg-[#2a2a2a] text-white"
              : "border border-zoom-border bg-white text-zoom-text",
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  onSelect: () => void;
  children: ReactNode;
  icon?: ReactNode;
  tone?: "light" | "dark";
  danger?: boolean;
  checked?: boolean;
  disabled?: boolean;
}

export function MenuItem({ onSelect, children, icon, tone = "light", danger, checked, disabled }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-50",
        tone === "dark" ? "hover:bg-white/10" : "hover:bg-zoom-bg",
        danger && "text-zoom-red",
      )}
    >
      {checked !== undefined && <span className="w-4 text-zoom-blue">{checked ? "✓" : ""}</span>}
      {icon}
      <span className="flex-1">{children}</span>
    </button>
  );
}
