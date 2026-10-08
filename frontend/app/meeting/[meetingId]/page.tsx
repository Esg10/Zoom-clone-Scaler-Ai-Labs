"use client";

import dynamic from "next/dynamic";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

// The meeting is entirely browser-driven (camera, WebRTC, sessionStorage), so skip SSR.
const MeetingPage = dynamic(() => import("@/components/meeting/MeetingPage").then((m) => m.MeetingPage), { ssr: false });

function MeetingRoute() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const pwd = useSearchParams().get("pwd") ?? "";
  return <MeetingPage code={meetingId} passcode={pwd} />;
}

export default function MeetingRoutePage() {
  return (
    <Suspense>
      <MeetingRoute />
    </Suspense>
  );
}
