"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { MicOff, MonitorUp } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

export interface TileData {
  id: number;
  name: string;
  stream: MediaStream | null;
  videoOn: boolean;
  audioMuted: boolean;
  isSelf: boolean;
  isHost: boolean;
  isSharing: boolean;
  handRaised: boolean;
  reaction?: string;
}

interface VideoTileProps {
  tile: TileData;
  speaking: boolean;
  variant?: "grid" | "focus" | "strip";
  style?: CSSProperties;
  className?: string;
}

const AVATAR_SIZE = { grid: "lg", focus: "xl", strip: "md" } as const;

/** One participant: live video (or avatar when the camera is off) plus name and mic state. */
export function VideoTile({ tile, speaking, variant = "grid", style, className }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo = Boolean(tile.stream) && (tile.videoOn || tile.isSharing);

  useEffect(() => {
    const video = videoRef.current;
    if (video && video.srcObject !== tile.stream) video.srcObject = tile.stream;
  }, [tile.stream, showVideo]);

  return (
    <div
      style={style}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-room-tile",
        speaking && "ring-[3px] ring-inset ring-room-speaker",
        className,
      )}
    >
      {showVideo ? (
        // Always muted: remote audio plays through <RemoteAudio> so it keeps
        // playing even when this tile isn't rendered (e.g. in speaker view).
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "h-full w-full",
            tile.isSharing ? "bg-black object-contain" : "object-cover",
            tile.isSelf && !tile.isSharing && "mirror",
          )}
        />
      ) : (
        <Avatar name={tile.name} size={AVATAR_SIZE[variant]} className={variant === "strip" ? "" : "rounded-full"} />
      )}

      <div className="absolute bottom-1.5 left-1.5 flex max-w-[calc(100%-12px)] items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
        {tile.audioMuted && <MicOff className="h-3.5 w-3.5 shrink-0 text-red-500" aria-label="Muted" />}
        {tile.isSharing && <MonitorUp className="h-3.5 w-3.5 shrink-0 text-green-400" aria-label="Sharing screen" />}
        <span className="truncate">{tile.name}</span>
      </div>

      {tile.handRaised && (
        <span
          role="img"
          aria-label="Hand raised"
          className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-lg shadow-md"
        >
          ✋
        </span>
      )}

      {tile.reaction && (
        <span key={tile.reaction} className="absolute right-2 top-2 animate-slide-up text-3xl drop-shadow" aria-label="Reaction">
          {tile.reaction}
        </span>
      )}
    </div>
  );
}
