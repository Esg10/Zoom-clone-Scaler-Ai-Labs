"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

interface MeetingStatusScreenProps {
  title: string;
  message?: string | null;
  action?: ReactNode;
}

/** Full-screen dark message: removed, meeting ended, left, or connection errors. */
export function MeetingStatusScreen({ title, message, action }: MeetingStatusScreenProps) {
  // Guests have no dashboard, so send them back to the join page instead.
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-room-bg px-6 text-center text-white">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {message && <p className="max-w-md text-sm text-room-muted">{message}</p>}
      <div className="mt-2 flex gap-3">
        {action}
        <Link
          href={user ? "/" : "/join"}
          className="inline-flex h-10 items-center rounded-lg bg-zoom-blue px-4 text-sm font-medium text-white hover:bg-zoom-blue-hover"
        >
          {user ? "Return to home" : "Join another meeting"}
        </Link>
      </div>
    </div>
  );
}
