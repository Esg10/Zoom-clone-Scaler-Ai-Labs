import { cn, colorForName, initials } from "@/lib/utils";

const SIZES = {
  sm: "h-7 w-7 text-[11px] rounded-md",
  md: "h-9 w-9 text-sm rounded-lg",
  lg: "h-16 w-16 text-2xl rounded-2xl",
  xl: "h-24 w-24 text-4xl rounded-3xl",
};

interface AvatarProps {
  name: string;
  color?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({ name, color, size = "md", className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center font-semibold text-white",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color ?? colorForName(name) }}
    >
      {initials(name)}
    </span>
  );
}
