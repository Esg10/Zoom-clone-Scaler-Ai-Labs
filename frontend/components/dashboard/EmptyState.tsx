import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zoom-bg text-zoom-muted">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-sm text-zoom-muted">{title}</p>
      {action}
    </div>
  );
}
