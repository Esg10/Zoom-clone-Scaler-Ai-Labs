import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string | null;
  hint?: ReactNode;
  tone?: "light" | "dark";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, tone = "light", className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className={cn("text-sm font-medium", tone === "dark" ? "text-white" : "text-zoom-text")}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(
          "h-10 w-full rounded-lg border px-3 text-sm outline-none transition-colors",
          "focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20",
          tone === "dark"
            ? "border-room-border bg-room-tile text-white placeholder:text-room-muted"
            : "border-zoom-border bg-white placeholder:text-zoom-muted",
          error && "border-zoom-red focus:border-zoom-red focus:ring-zoom-red/20",
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-zoom-red">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-zoom-muted">{hint}</p>
      )}
    </div>
  );
});
