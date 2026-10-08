"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { MediaControls } from "@/hooks/useMediaDevices";
import { cn, formatMeetingId } from "@/lib/utils";
import type { MeetingSummary } from "@/types";

interface PreJoinProps {
  meeting: MeetingSummary;
  media: MediaControls;
  defaultName: string;
  needsPasscode: boolean;
  joining: boolean;
  error: string | null;
  onJoin: (name: string, passcode: string) => void;
}

/** Camera/mic preview with name entry, shown before entering the room. */
export function PreJoin({ meeting, media, defaultName, needsPasscode, joining, error, onJoin }: PreJoinProps) {
  const [name, setName] = useState(defaultName);
  const [passcode, setPasscode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (defaultName) setName((current) => current || defaultName);
  }, [defaultName]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = media.previewStream;
  }, [media.previewStream]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onJoin(name.trim(), passcode.trim());
  };

  return (
    <div className="flex min-h-screen flex-col bg-room-bg text-white">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 lg:flex-row lg:gap-10">
        <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-2xl bg-room-tile">
          {media.videoEnabled ? (
            <video ref={videoRef} autoPlay playsInline muted className="mirror h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Avatar name={name || "?"} size="xl" className="rounded-full" />
              <p className="text-sm text-room-muted">
                {media.ready ? "Your camera is off" : "Waiting for camera and microphone access…"}
              </p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
            <PreviewToggle
              on={media.audioEnabled}
              label={media.audioEnabled ? "Mute" : "Unmute"}
              onClick={() => void media.setMuted(media.audioEnabled)}
              icon={media.audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            />
            <PreviewToggle
              on={media.videoEnabled}
              label={media.videoEnabled ? "Stop Video" : "Start Video"}
              onClick={() => void media.setVideoOn(!media.videoEnabled)}
              icon={media.videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            />
          </div>
        </div>

        <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{meeting.title}</h1>
            <p className="mt-1 text-sm text-room-muted">Meeting ID: {formatMeetingId(meeting.meeting_code)}</p>
          </div>
          <Input tone="dark" label="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
          {needsPasscode && (
            <Input tone="dark" label="Meeting passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
          )}
          {(error || media.error) && (
            <p
              role="alert"
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                error ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-200",
              )}
            >
              {error ?? media.error}
            </p>
          )}
          <Button type="submit" size="lg" loading={joining} disabled={!name.trim() || (needsPasscode && !passcode.trim())}>
            Join
          </Button>
        </form>
      </div>
    </div>
  );
}

function PreviewToggle({ on, label, icon, onClick }: { on: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full backdrop-blur transition-colors",
        on ? "bg-white/20 hover:bg-white/30" : "bg-zoom-red hover:bg-zoom-red-hover",
      )}
    >
      {icon}
    </button>
  );
}
