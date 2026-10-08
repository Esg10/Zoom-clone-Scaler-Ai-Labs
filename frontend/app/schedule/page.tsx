"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ScheduleForm } from "@/components/schedule/ScheduleForm";

function SchedulePageContent() {
  const editCode = useSearchParams().get("edit");
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-2xl font-semibold">{editCode ? "Edit Meeting" : "Schedule Meeting"}</h1>
      <div className="rounded-2xl border border-zoom-border bg-white px-4 py-2 shadow-card sm:px-8 sm:py-4">
        <ScheduleForm key={editCode ?? "new"} editCode={editCode} />
      </div>
    </main>
  );
}

export default function SchedulePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Suspense>
        <SchedulePageContent />
      </Suspense>
    </div>
  );
}
