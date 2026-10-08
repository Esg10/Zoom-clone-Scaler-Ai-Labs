"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { InviteLanding } from "@/components/join/InviteLanding";
import { CenteredPage } from "@/components/layout/CenteredPage";

function InviteContent() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const pwd = useSearchParams().get("pwd") ?? "";
  return <InviteLanding code={meetingId} linkPasscode={pwd} />;
}

export default function InviteLinkPage() {
  return (
    <CenteredPage title="Join Meeting">
      <Suspense>
        <InviteContent />
      </Suspense>
    </CenteredPage>
  );
}
