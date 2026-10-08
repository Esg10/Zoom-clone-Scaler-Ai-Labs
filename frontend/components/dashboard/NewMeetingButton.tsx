"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Video } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { useAuth } from "@/hooks/useAuth";
import { formatMeetingId } from "@/lib/utils";
import { ActionButton } from "./ActionButton";

interface NewMeetingButtonProps {
  onStart: (options: { withVideo: boolean; usePersonalId: boolean }) => Promise<void>;
}

const PREFS_KEY = "zoom-clone:new-meeting-prefs";

/** Orange "New Meeting" tile whose chevron opens Zoom's start options. */
export function NewMeetingButton({ onStart }: NewMeetingButtonProps) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [prefs, setPrefs] = useState({ withVideo: true, usePersonalId: false });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) setPrefs(JSON.parse(saved));
    } catch {
      // Ignore unavailable/corrupt storage and keep defaults.
    }
  }, []);

  const toggle = (key: keyof typeof prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      // Preference just won't persist.
    }
  };

  const start = async () => {
    setStarting(true);
    await onStart(prefs);
    setStarting(false);
  };

  return (
    <ActionButton
      icon={Video}
      name="New Meeting"
      color="orange"
      onClick={start}
      disabled={starting}
      label={
        <Popover
          open={menuOpen}
          onOpenChange={setMenuOpen}
          align="center"
          className="w-72"
          trigger={
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="New meeting options"
              className="flex items-center gap-1 rounded px-1 hover:bg-black/5"
            >
              New Meeting <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
          }
        >
          <ToggleRow label="Start with video" checked={prefs.withVideo} onChange={() => toggle("withVideo")} />
          <ToggleRow
            label="Use my personal meeting ID (PMI)"
            hint={user ? formatMeetingId(user.personal_meeting_id) : undefined}
            checked={prefs.usePersonalId}
            onChange={() => toggle("usePersonalId")}
          />
        </Popover>
      }
    />
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-zoom-bg">
      <span>
        {label}
        {hint && <span className="block text-xs text-zoom-muted">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-zoom-blue" />
    </label>
  );
}
