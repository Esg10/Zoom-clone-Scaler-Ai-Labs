import type { ReactNode } from "react";

interface FormRowProps {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}

/** Zoom web-portal style row: label column on the left, controls on the right. */
export function FormRow({ label, htmlFor, error, children }: FormRowProps) {
  return (
    <div className="grid gap-2 border-b border-zoom-border py-5 last:border-b-0 md:grid-cols-[180px_1fr] md:gap-6">
      <label htmlFor={htmlFor} className="pt-2 text-sm font-medium text-zoom-text">
        {label}
      </label>
      <div className="min-w-0">
        {children}
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-zoom-red">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
