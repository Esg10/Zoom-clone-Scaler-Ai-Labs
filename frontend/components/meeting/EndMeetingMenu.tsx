"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";

interface EndMeetingMenuProps {
  isHost: boolean;
  onLeave: () => void;
  onEndForAll: () => Promise<void>;
}

/** Red "End" button; hosts can end for everyone, others can only leave. */
export function EndMeetingMenu({ isHost, onLeave, onEndForAll }: EndMeetingMenuProps) {
  const [open, setOpen] = useState(false);
  const [ending, setEnding] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      side="top"
      align="end"
      tone="dark"
      className="w-64 p-3"
      trigger={
        <Button variant="danger" size="sm" className="h-9 px-4" onClick={() => setOpen(!open)}>
          {isHost ? "End" : "Leave"}
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        {isHost && (
          <Button
            variant="danger"
            loading={ending}
            onClick={async () => {
              setEnding(true);
              await onEndForAll();
              setEnding(false);
            }}
          >
            End meeting for all
          </Button>
        )}
        <Button variant="dark" onClick={onLeave}>
          Leave meeting
        </Button>
      </div>
    </Popover>
  );
}
