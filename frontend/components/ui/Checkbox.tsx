import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  description?: ReactNode;
}

export function Checkbox({ label, description, className, ...rest }: CheckboxProps) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm", rest.disabled && "cursor-not-allowed opacity-60", className)}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-zoom-blue" {...rest} />
      <span>
        <span className="text-zoom-text">{label}</span>
        {description && <span className="block text-xs text-zoom-muted">{description}</span>}
      </span>
    </label>
  );
}
