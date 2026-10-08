"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Participant } from "@/types";

interface WaitingRoomNoticeProps {
  waiting: Participant[];
  onAdmit: (id: number) => void;
  onOpenPanel: () => void;
}

/** Zoom-style popup telling the host someone entered the waiting room. */
export function WaitingRoomNotice({ waiting, onAdmit, onOpenPanel }: WaitingRoomNoticeProps) {
  const [dismissedId, setDismissedId] = useState<number | null>(null);
  const latest = waiting[waiting.length - 1];
  if (!latest || latest.id === dismissedId) return null;

  const others = waiting.length - 1;
  return (
    <div role="status" className="absolute right-3 top-3 z-20 w-72 animate-slide-up rounded-xl bg-[#2a2a2a] p-4 shadow-popover">
      <p className="text-sm">
        <span className="font-semibold">{latest.display_name}</span>
        {others > 0 ? ` and ${others} other${others > 1 ? "s" : ""} are` : " has"} entered the waiting room.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => onAdmit(latest.id)}>
          Admit
        </Button>
        <Button
          size="sm"
          variant="dark"
          onClick={() => {
            setDismissedId(latest.id);
            onOpenPanel();
          }}
        >
          See waiting room
        </Button>
      </div>
    </div>
  );
}
