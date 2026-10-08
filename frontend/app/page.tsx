"use client";

import { ActionGrid } from "@/components/dashboard/ActionGrid";
import { ClockBanner } from "@/components/dashboard/ClockBanner";
import { RecentList } from "@/components/dashboard/RecentList";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { UpcomingList } from "@/components/dashboard/UpcomingList";
import { Navbar } from "@/components/layout/Navbar";
import { useMeetingLists } from "@/hooks/useMeetingLists";

export default function DashboardPage() {
  const { upcoming, recent, loading, error, refresh } = useMeetingLists();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-6 md:flex-row md:items-center md:gap-10 md:px-8 lg:min-h-[calc(100vh-3.5rem)] lg:gap-20">
        <section className="flex justify-center md:flex-1" aria-label="Quick actions">
          <ActionGrid />
        </section>

        <section className="w-full md:w-[420px] lg:w-[480px]" aria-label="Your meetings">
          <div className="overflow-hidden rounded-2xl border border-zoom-border bg-white shadow-card">
            <ClockBanner />
            <div className="scrollbar-thin max-h-[calc(100vh-20rem)] min-h-[200px] overflow-y-auto px-2 pb-3">
              {error ? (
                <p role="alert" className="px-3 py-8 text-center text-sm text-zoom-red">
                  {error}
                </p>
              ) : (
                <>
                  <SectionHeader title="Upcoming" href="/meetings" />
                  <UpcomingList meetings={upcoming} loading={loading} onChanged={refresh} limit={4} />
                  <div className="mx-3 my-2 border-t border-zoom-border" />
                  <SectionHeader title="Recent" href="/meetings?tab=previous" />
                  <RecentList meetings={recent} loading={loading} limit={3} />
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
