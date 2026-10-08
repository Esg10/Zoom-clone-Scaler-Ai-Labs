import type { ReactNode } from "react";
import { X } from "lucide-react";

interface SidePanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Right-hand panel on desktop; full-screen sheet on phones. */
export function SidePanel({ title, onClose, children, footer }: SidePanelProps) {
  return (
    <aside className="fixed inset-0 z-40 flex flex-col bg-room-panel text-white md:static md:z-auto md:w-80 md:shrink-0 md:rounded-lg md:border md:border-room-border">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-room-border px-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="rounded p-1 text-room-muted hover:bg-room-hover hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && <div className="shrink-0 border-t border-room-border p-3">{footer}</div>}
    </aside>
  );
}
