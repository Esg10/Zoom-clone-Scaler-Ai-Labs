import { Check, X } from "lucide-react";
import type { Meeting } from "@/types";

/** Read-only summary of the meeting's security settings. */
export function SecurityMenu({ meeting }: { meeting: Meeting }) {
  const rows = [
    { label: "Passcode required", on: true },
    { label: "Waiting Room", on: meeting.waiting_room_enabled },
    { label: "Mute participants upon entry", on: meeting.mute_on_entry },
  ];
  return (
    <div className="p-2">
      <p className="pb-2 text-xs font-semibold text-room-muted">Meeting security</p>
      {rows.map(({ label, on }) => (
        <p key={label} className="flex items-center justify-between gap-4 py-1.5 text-sm">
          {label}
          {on ? <Check className="h-4 w-4 text-green-400" aria-label="On" /> : <X className="h-4 w-4 text-room-muted" aria-label="Off" />}
        </p>
      ))}
    </div>
  );
}
