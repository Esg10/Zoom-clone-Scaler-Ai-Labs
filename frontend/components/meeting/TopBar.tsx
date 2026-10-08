"use client";

import { useState } from "react";
import { Check, ChevronDown, LayoutGrid, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MenuItem, Popover } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/Toast";
import { copyText, formatMeetingId } from "@/lib/utils";
import type { Meeting } from "@/types";

export type ViewMode = "gallery" | "speaker";

interface TopBarProps {
  meeting: Meeting;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function TopBar({ meeting, view, onViewChange }: TopBarProps) {
  const toast = useToast();
  const [open, setOpen] = useState<"info" | "view" | null>(null);

  const copyLink = async () => {
    const ok = await copyText(meeting.invite_link);
    toast(ok ? "Invite link copied" : "Couldn't access the clipboard", ok ? "success" : "error");
  };

  const info = [
    ["Meeting ID", formatMeetingId(meeting.meeting_code)],
    ["Host", meeting.host_name],
    ["Passcode", meeting.passcode],
  ];

  return (
    <header className="flex h-11 shrink-0 items-center justify-between px-3 text-white">
      <Popover
        open={open === "info"}
        onOpenChange={(value) => setOpen(value ? "info" : null)}
        tone="dark"
        className="w-80 p-4"
        trigger={
          <button
            type="button"
            onClick={() => setOpen(open === "info" ? null : "info")}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-room-hover"
            aria-label="Meeting information"
          >
            <ShieldCheck className="h-5 w-5 fill-[#23D959] text-room-bg" />
            <span className="max-w-[40vw] truncate text-sm font-medium">{meeting.title}</span>
          </button>
        }
      >
        <h2 className="mb-3 text-base font-semibold">{meeting.title}</h2>
        <dl className="space-y-2 text-sm">
          {info.map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <dt className="w-24 shrink-0 text-room-muted">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-room-muted">Invite link</dt>
            <dd className="min-w-0 break-all text-xs text-room-muted">{meeting.invite_link}</dd>
          </div>
        </dl>
        <Button size="sm" className="mt-4 w-full" onClick={copyLink}>
          Copy Link
        </Button>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-room-muted">
          <Check className="h-3.5 w-3.5 text-green-400" /> Audio and video are sent peer-to-peer and encrypted (DTLS-SRTP)
        </p>
      </Popover>

      <Popover
        open={open === "view"}
        onOpenChange={(value) => setOpen(value ? "view" : null)}
        align="end"
        tone="dark"
        className="w-44"
        trigger={
          <button
            type="button"
            onClick={() => setOpen(open === "view" ? null : "view")}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-room-hover"
          >
            <LayoutGrid className="h-4 w-4" /> View <ChevronDown className="h-3.5 w-3.5" />
          </button>
        }
      >
        {(["speaker", "gallery"] as const).map((mode) => (
          <MenuItem
            key={mode}
            tone="dark"
            checked={view === mode}
            onSelect={() => {
              onViewChange(mode);
              setOpen(null);
            }}
          >
            {mode === "speaker" ? "Speaker" : "Gallery"}
          </MenuItem>
        ))}
      </Popover>
    </header>
  );
}
