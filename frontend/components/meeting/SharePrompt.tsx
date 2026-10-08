"use client";

import { useState } from "react";
import { MonitorUp } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Shown after joining from the dashboard's "Share Screen" tile. Browsers only
 * allow getDisplayMedia from a click, so we ask instead of starting automatically.
 */
export function SharePrompt({ onShare }: { onShare: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-[#2a2a2a] px-4 py-3 shadow-popover">
      <MonitorUp className="h-5 w-5 text-green-400" aria-hidden />
      <span className="text-sm">Ready to share your screen?</span>
      <Button
        size="sm"
        onClick={() => {
          setDismissed(true);
          onShare();
        }}
      >
        Share Screen
      </Button>
      <Button size="sm" variant="dark" onClick={() => setDismissed(true)}>
        Not now
      </Button>
    </div>
  );
}
