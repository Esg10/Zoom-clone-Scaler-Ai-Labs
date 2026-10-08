"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarX2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useMeetingActions } from "@/hooks/useMeetingActions";
import { dayKey, formatDayLabel, groupByDay, meetingStart } from "@/lib/utils";
import type { Meeting } from "@/types";
import { EmptyState } from "./EmptyState";
import { MeetingCard } from "./MeetingCard";

interface UpcomingListProps {
  meetings: Meeting[];
  loading: boolean;
  onChanged: () => void;
  /** Group under date headings (Meetings page) instead of a flat list (dashboard). */
  grouped?: boolean;
  limit?: number;
}

export function UpcomingList({ meetings, loading, onChanged, grouped = false, limit }: UpcomingListProps) {
  const actions = useMeetingActions();
  const [pendingDelete, setPendingDelete] = useState<Meeting | null>(null);

  if (loading) return <ListSkeleton rows={3} />;
  if (!meetings.length) {
    return (
      <EmptyState
        icon={CalendarX2}
        title={grouped ? "No upcoming meetings" : "No upcoming meetings today"}
        action={
          <Link href="/schedule" className="text-sm font-medium text-zoom-blue hover:underline">
            Schedule a meeting
          </Link>
        }
      />
    );
  }

  const cardActions = {
    onStart: actions.startMeeting,
    onCopy: actions.copyInvitation,
    onEdit: actions.editMeeting,
    onDelete: setPendingDelete,
  };
  const visible = limit ? meetings.slice(0, limit) : meetings;
  const hasToday = meetings.some((m) => dayKey(meetingStart(m)) === dayKey(new Date()));

  return (
    <>
      {grouped ? (
        groupByDay(visible, meetingStart).map(([day, items]) => (
          <section key={day} className="mb-4">
            <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-zoom-muted">
              {formatDayLabel(meetingStart(items[0]))}
            </h3>
            {items.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} showDay={false} {...cardActions} />
            ))}
          </section>
        ))
      ) : (
        <>
          {!hasToday && <p className="px-3 pb-1 text-xs text-zoom-muted">No upcoming meetings today</p>}
          {visible.map((meeting) => (
            <MeetingCard key={meeting.id} meeting={meeting} {...cardActions} />
          ))}
        </>
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete meeting?"
        message={`"${pendingDelete?.title}" will be cancelled and removed from your upcoming meetings.`}
        confirmLabel="Delete"
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete && (await actions.cancelMeeting(pendingDelete))) onChanged();
        }}
      />
    </>
  );
}
