"use client";

import { History, Users } from "lucide-react";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatDayLabel, formatDuration, formatMeetingId, formatTime, groupByDay, meetingStart } from "@/lib/utils";
import type { Meeting } from "@/types";
import { EmptyState } from "./EmptyState";

interface RecentListProps {
  meetings: Meeting[];
  loading: boolean;
  grouped?: boolean;
  limit?: number;
}

const actualMinutes = (m: Meeting) =>
  m.started_at && m.ended_at
    ? Math.max(1, Math.round((new Date(m.ended_at).getTime() - new Date(m.started_at).getTime()) / 60_000))
    : m.duration_minutes;

export function RecentList({ meetings, loading, grouped = false, limit }: RecentListProps) {
  if (loading) return <ListSkeleton rows={2} />;
  if (!meetings.length) return <EmptyState icon={History} title="No recent meetings" />;

  const visible = limit ? meetings.slice(0, limit) : meetings;
  if (!grouped)
    return (
      <>
        {visible.map((m) => (
          <RecentRow key={m.id} meeting={m} showDay />
        ))}
      </>
    );

  return (
    <>
      {groupByDay(visible, meetingStart).map(([day, items]) => (
        <section key={day} className="mb-4">
          <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-zoom-muted">
            {formatDayLabel(meetingStart(items[0]))}
          </h3>
          {items.map((m) => (
            <RecentRow key={m.id} meeting={m} />
          ))}
        </section>
      ))}
    </>
  );
}

function RecentRow({ meeting, showDay = false }: { meeting: Meeting; showDay?: boolean }) {
  const { user } = useCurrentUser();
  const start = meetingStart(meeting);
  return (
    <article className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-zoom-bg">
      <div className="mt-1 h-10 w-1 shrink-0 rounded-full bg-zoom-border" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zoom-muted">
          {showDay && <span className="font-medium text-zoom-text">{formatDayLabel(start)} · </span>}
          {formatTime(start)} · {formatDuration(actualMinutes(meeting))}
        </p>
        <h3 className="mt-0.5 truncate text-sm font-semibold">{meeting.title}</h3>
        <p className="text-xs text-zoom-muted">
          Meeting ID: {formatMeetingId(meeting.meeting_code)}
          {user && meeting.host_id !== user.id && <> · Host: {meeting.host_name}</>}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs text-zoom-muted" title="Participants">
        <Users className="h-3.5 w-3.5" aria-hidden />
        {meeting.participant_count}
      </span>
    </article>
  );
}
