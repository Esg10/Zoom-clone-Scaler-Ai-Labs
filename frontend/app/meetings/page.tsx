"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CalendarClock, History, Plus, UserRound } from "lucide-react";
import { RecentList } from "@/components/dashboard/RecentList";
import { UpcomingList } from "@/components/dashboard/UpcomingList";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar, type SidebarItem } from "@/components/layout/Sidebar";
import { PersonalRoom } from "@/components/meetings/PersonalRoom";
import { useMeetingLists } from "@/hooks/useMeetingLists";
import type { Meeting } from "@/types";

const TABS: SidebarItem[] = [
  { key: "upcoming", label: "Upcoming", href: "/meetings", icon: CalendarClock },
  { key: "previous", label: "Previous", href: "/meetings?tab=previous", icon: History },
  { key: "personal", label: "Personal Room", href: "/meetings?tab=personal", icon: UserRound },
];

/** Navbar search: match by topic, or by meeting ID when the query has digits. */
const matches = (query: string) => (meeting: Meeting) => {
  if (!query) return true;
  const digits = query.replace(/\D/g, "");
  return meeting.title.toLowerCase().includes(query) || (digits.length > 0 && meeting.meeting_code.includes(digits));
};

function MeetingsContent() {
  const params = useSearchParams();
  const tab = params.get("tab") ?? "upcoming";
  const query = (params.get("q") ?? "").trim().toLowerCase();
  const { upcoming, recent, loading, error, refresh } = useMeetingLists();
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];

  return (
    <div className="flex flex-col bg-white md:min-h-[calc(100vh-3.5rem)] md:flex-row">
      <Sidebar title="Meetings" items={TABS} activeKey={active.key} />
      <main className="w-full max-w-4xl flex-1 px-3 py-5 sm:px-6 md:py-6">
        <div className="mb-4 flex items-center justify-between gap-3 px-3">
          <h2 className="text-xl font-semibold">{active.label}</h2>
          {active.key !== "personal" && (
            <Link
              href="/schedule"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zoom-blue px-3 text-sm font-medium text-white hover:bg-zoom-blue-hover"
            >
              <Plus className="h-4 w-4" /> Schedule
            </Link>
          )}
        </div>
        {query && (
          <p className="mb-3 px-3 text-sm text-zoom-muted">
            Showing results for &quot;{params.get("q")}&quot; ·{" "}
            <Link href={active.href} className="text-zoom-blue hover:underline">
              Clear
            </Link>
          </p>
        )}
        {error && (
          <p role="alert" className="px-3 text-sm text-zoom-red">
            {error}
          </p>
        )}
        {active.key === "upcoming" && (
          <UpcomingList meetings={upcoming.filter(matches(query))} loading={loading} onChanged={refresh} grouped />
        )}
        {active.key === "previous" && <RecentList meetings={recent.filter(matches(query))} loading={loading} grouped />}
        {active.key === "personal" && (
          <div className="px-3">
            <PersonalRoom />
          </div>
        )}
      </main>
    </div>
  );
}

export default function MeetingsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Suspense>
        <MeetingsContent />
      </Suspense>
    </div>
  );
}
