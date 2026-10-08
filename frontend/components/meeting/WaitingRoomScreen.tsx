import { Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Meeting } from "@/types";

/** What a participant sees until the host admits them. */
export function WaitingRoomScreen({ meeting, onLeave }: { meeting: Meeting; onLeave: () => void }) {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-room-bg px-6 text-center text-white">
      <Clock className="h-10 w-10 text-room-muted" aria-hidden />
      <h1 className="text-2xl font-semibold">Please wait, the meeting host will let you in soon.</h1>
      <p className="text-sm text-room-muted">{meeting.title}</p>
      <Button variant="dark" onClick={onLeave} className="mt-4">
        Leave
      </Button>
    </div>
  );
}
