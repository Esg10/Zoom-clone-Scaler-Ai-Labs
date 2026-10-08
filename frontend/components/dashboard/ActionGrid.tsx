"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays, MonitorUp, Plus } from "lucide-react";
import { JoinModal } from "@/components/join/JoinModal";
import { useMeetingActions } from "@/hooks/useMeetingActions";
import { ActionButton } from "./ActionButton";
import { NewMeetingButton } from "./NewMeetingButton";

type JoinMode = "join" | "share" | null;

export function ActionGrid() {
  const router = useRouter();
  const { startInstant } = useMeetingActions();
  const [joinMode, setJoinMode] = useState<JoinMode>(null);

  return (
    <>
      <div className="grid grid-cols-4 gap-x-4 gap-y-8 md:grid-cols-2 md:gap-x-14 md:gap-y-10">
        <NewMeetingButton onStart={startInstant} />
        <ActionButton icon={Plus} color="blue" name="Join" onClick={() => setJoinMode("join")} />
        <ActionButton icon={CalendarDays} color="blue" name="Schedule" onClick={() => router.push("/schedule")} />
        <ActionButton icon={MonitorUp} color="blue" name="Share Screen" onClick={() => setJoinMode("share")} />
      </div>
      <JoinModal open={joinMode !== null} shareScreen={joinMode === "share"} onClose={() => setJoinMode(null)} />
    </>
  );
}
