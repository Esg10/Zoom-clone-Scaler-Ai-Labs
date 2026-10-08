"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { api, ApiError } from "@/lib/api";
import { loadJoinPrefs } from "@/lib/joinPrefs";
import type { Meeting, Participant } from "@/types";
import { MeetingRoom, type ExitReason } from "./MeetingRoom";
import { MeetingStatusScreen } from "./MeetingStatusScreen";
import { PreJoin } from "./PreJoin";

type Phase =
  | { kind: "loading" }
  | { kind: "prejoin"; meeting: Meeting }
  | { kind: "room"; meeting: Meeting; self: Participant }
  | { kind: "exit"; reason: ExitReason | "unavailable"; message?: string | null };

const EXIT_COPY: Record<ExitReason | "unavailable", { title: string; message?: string; rejoin?: boolean }> = {
  left: { title: "You left the meeting", rejoin: true },
  removed: { title: "You have been removed from this meeting", message: "The host removed you from the meeting." },
  ended: { title: "This meeting has been ended by the host" },
  disconnected: { title: "You've been disconnected", message: "The connection to the meeting was lost.", rejoin: true },
  rejected: { title: "Unable to join this meeting" },
  unavailable: { title: "Unable to join this meeting" },
};

/** Drives one visit to /meeting/:code — preview, room, then an exit screen. */
export function MeetingPage({ code, passcode }: { code: string; passcode: string }) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useCurrentUser();
  const [prefs] = useState(() => loadJoinPrefs(code));
  // Media lives here (not in the room) so the preview's camera carries into the call.
  const media = useMediaDevices({ audio: !prefs.audioOff, video: !prefs.videoOff });
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMeeting(code)
      .then((meeting) => {
        if (meeting.status === "ended" || meeting.status === "cancelled") {
          setPhase({
            kind: "exit",
            reason: "unavailable",
            message: `This meeting has ${meeting.status === "ended" ? "ended" : "been cancelled"}.`,
          });
        } else {
          setPhase({ kind: "prejoin", meeting });
        }
      })
      .catch((err) =>
        setPhase({
          kind: "exit",
          reason: "unavailable",
          message: err instanceof ApiError ? err.message : "Couldn't load the meeting.",
        }),
      );
  }, [code]);

  const join = async (name: string, typedPasscode: string) => {
    setJoining(true);
    setJoinError(null);
    try {
      const { participant, meeting } = await api.joinMeeting(code, {
        display_name: name,
        passcode: passcode || typedPasscode || undefined,
        user_id: prefs.asHost ? user?.id : undefined,
        is_video_on: media.videoEnabled,
      });
      if (participant.is_muted) await media.setMuted(true); // "mute participants upon entry"
      setPhase({ kind: "room", meeting, self: participant });
    } catch (err) {
      setJoinError(err instanceof ApiError ? err.message : "Couldn't join the meeting.");
    } finally {
      setJoining(false);
    }
  };

  const { stopAll } = media;
  const isHost = phase.kind === "room" && phase.self.role === "host";
  const exit = useCallback(
    (reason: ExitReason, message?: string | null) => {
      stopAll();
      if (reason === "ended" && isHost) {
        toast("Meeting ended for all", "success");
        router.replace("/");
        return;
      }
      setPhase({ kind: "exit", reason, message });
    },
    [stopAll, isHost, toast, router],
  );

  if (phase.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-room-bg text-room-muted">
        <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading meeting" />
      </div>
    );
  }

  if (phase.kind === "exit") {
    const copy = EXIT_COPY[phase.reason];
    return (
      <MeetingStatusScreen
        title={copy.title}
        message={phase.message ?? copy.message}
        action={
          copy.rejoin && (
            <Button variant="dark" onClick={() => window.location.reload()}>
              Rejoin
            </Button>
          )
        }
      />
    );
  }

  if (phase.kind === "prejoin") {
    return (
      <PreJoin
        meeting={phase.meeting}
        media={media}
        defaultName={prefs.displayName ?? user?.name ?? ""}
        needsPasscode={!prefs.asHost && !passcode}
        joining={joining || (Boolean(prefs.asHost) && !user)}
        error={joinError}
        onJoin={join}
      />
    );
  }

  return (
    <MeetingRoom
      meeting={phase.meeting}
      self={phase.self}
      media={media}
      showInviteOnStart={Boolean(prefs.showInvite)}
      promptShare={Boolean(prefs.shareOnJoin)}
      onExit={exit}
    />
  );
}
