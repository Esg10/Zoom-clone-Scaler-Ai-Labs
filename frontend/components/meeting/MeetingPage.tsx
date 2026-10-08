"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { api, ApiError } from "@/lib/api";
import { loadJoinPrefs } from "@/lib/joinPrefs";
import type { Meeting, MeetingSummary, Participant } from "@/types";
import { MeetingRoom, type ExitReason } from "./MeetingRoom";
import { MeetingStatusScreen } from "./MeetingStatusScreen";
import { PreJoin } from "./PreJoin";

type Phase =
  | { kind: "loading" }
  | { kind: "prejoin"; meeting: MeetingSummary }
  | { kind: "room"; meeting: Meeting; self: Participant; token: string }
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
  const { user, loading: authLoading } = useAuth();
  const [prefs] = useState(() => loadJoinPrefs(code));
  // Media lives here (not in the room) so the preview's camera carries into the call.
  const media = useMediaDevices({ audio: !prefs.audioOff, video: !prefs.videoOff });
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  // Set when the passcode from the link was rejected, so the guest can type one.
  const [passcodeRejected, setPasscodeRejected] = useState(false);

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
      // The server makes us host only if our login token belongs to the meeting owner.
      const { participant, meeting, participant_token } = await api.joinMeeting(code, {
        display_name: name,
        passcode: typedPasscode || passcode || undefined,
        is_video_on: media.videoEnabled,
      });
      if (participant.is_muted) await media.setMuted(true); // "mute participants upon entry"
      setPhase({ kind: "room", meeting, self: participant, token: participant_token });
    } catch (err) {
      setJoinError(err instanceof ApiError ? err.message : "Couldn't join the meeting.");
      if (err instanceof ApiError && (err.code === "invalid_passcode" || err.code === "passcode_required")) {
        setPasscodeRejected(true);
      }
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
        // The owner never needs the passcode; guests do unless the link carried a valid one.
        needsPasscode={user?.id !== phase.meeting.host_id && (!passcode || passcodeRejected)}
        joining={joining || authLoading}
        error={joinError}
        onJoin={join}
      />
    );
  }

  return (
    <MeetingRoom
      meeting={phase.meeting}
      self={phase.self}
      participantToken={phase.token}
      media={media}
      showInviteOnStart={Boolean(prefs.showInvite)}
      promptShare={Boolean(prefs.shareOnJoin)}
      onExit={exit}
    />
  );
}
