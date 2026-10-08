"use client";

import { Copy, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatDayLabel, formatMeetingId, formatTimeRange, meetingStart } from "@/lib/utils";
import type { Meeting } from "@/types";

export interface MeetingCardActions {
  onStart: (meeting: Meeting) => void;
  onCopy: (meeting: Meeting) => void;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meeting: Meeting) => void;
}

interface MeetingCardProps extends MeetingCardActions {
  meeting: Meeting;
  showDay?: boolean;
}

/** One upcoming meeting row: time, title, ID and Start/Copy/Edit/Delete. */
export function MeetingCard({ meeting, showDay = true, onStart, onCopy, onEdit, onDelete }: MeetingCardProps) {
  const start = meetingStart(meeting);
  const isLive = meeting.status === "live";

  return (
    <article className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-zoom-bg">
      <div className={cn("mt-1 h-10 w-1 shrink-0 rounded-full", isLive ? "bg-zoom-green" : "bg-zoom-blue")} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zoom-muted">
          {showDay && <span className="font-medium text-zoom-text">{formatDayLabel(start)} · </span>}
          {formatTimeRange(start, meeting.duration_minutes)}
          {isLive && <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-green-700">Live</span>}
        </p>
        <h3 className="mt-0.5 truncate text-sm font-semibold">{meeting.title}</h3>
        <p className="text-xs text-zoom-muted">Meeting ID: {formatMeetingId(meeting.meeting_code)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button size="sm" onClick={() => onStart(meeting)} className="mr-1">
          Start
        </Button>
        <IconAction label="Copy invitation" onClick={() => onCopy(meeting)} icon={<Copy className="h-4 w-4" />} />
        <IconAction label="Edit meeting" onClick={() => onEdit(meeting)} icon={<Pencil className="h-4 w-4" />} disabled={isLive} />
        <IconAction label="Delete meeting" onClick={() => onDelete(meeting)} icon={<Trash2 className="h-4 w-4" />} disabled={isLive} />
      </div>
    </article>
  );
}

function IconAction({ label, icon, onClick, disabled }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg p-2 text-zoom-muted transition-colors hover:bg-white hover:text-zoom-text disabled:pointer-events-none disabled:opacity-30"
    >
      {icon}
    </button>
  );
}
