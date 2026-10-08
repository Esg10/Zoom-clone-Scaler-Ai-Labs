import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  icon: LucideIcon;
  label: ReactNode;
  color: "orange" | "blue";
  onClick: () => void;
  disabled?: boolean;
}

/** Large rounded-square tile with the label underneath (Zoom home screen). */
export function ActionButton({ icon: Icon, label, color, onClick, disabled }: ActionButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-[20px] text-white shadow-sm transition-all sm:h-20 sm:w-20 sm:rounded-3xl",
          "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:opacity-60",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zoom-blue",
          color === "orange" ? "bg-zoom-orange hover:bg-zoom-orange-hover" : "bg-zoom-blue hover:bg-zoom-blue-hover",
        )}
      >
        <Icon className="h-7 w-7 sm:h-9 sm:w-9" strokeWidth={1.75} aria-hidden />
      </button>
      <div className="text-xs font-medium text-zoom-text sm:text-sm">{label}</div>
    </div>
  );
}
