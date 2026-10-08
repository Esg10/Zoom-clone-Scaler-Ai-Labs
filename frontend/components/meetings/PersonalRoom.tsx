"use client";

import { Copy, Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMeetingActions } from "@/hooks/useMeetingActions";
import { copyText, formatMeetingId } from "@/lib/utils";

/** The user's reusable Personal Meeting ID (PMI) room. */
export function PersonalRoom() {
  const { user } = useCurrentUser();
  const { startInstant } = useMeetingActions();
  const toast = useToast();
  if (!user) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="rounded-xl border border-zoom-border p-5">
      <h2 className="text-lg font-semibold">{user.name}&apos;s Personal Meeting Room</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[160px_1fr]">
        <dt className="text-zoom-muted">Personal Meeting ID</dt>
        <dd className="font-medium">{formatMeetingId(user.personal_meeting_id)}</dd>
        <dt className="text-zoom-muted">Use for instant meetings</dt>
        <dd>Choose &quot;Use my personal meeting ID&quot; from the New Meeting menu on Home.</dd>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => startInstant({ withVideo: true, usePersonalId: true })}>
          <Video className="h-4 w-4" /> Start Meeting
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            const ok = await copyText(user.personal_meeting_id);
            toast(ok ? "Meeting ID copied" : "Couldn't access the clipboard", ok ? "success" : "error");
          }}
        >
          <Copy className="h-4 w-4" /> Copy Meeting ID
        </Button>
      </div>
    </div>
  );
}
