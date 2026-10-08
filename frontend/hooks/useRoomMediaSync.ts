"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import type { MeetingSocket } from "@/lib/signaling";
import type { MediaControls } from "./useMediaDevices";

/**
 * Keeps the server (and so every other participant) in sync with our local
 * mic/camera/screen-share state, and applies host "mute" commands locally.
 */
export function useRoomMediaSync(socket: MeetingSocket | null, media: MediaControls, selfId: number): void {
  const toast = useToast();
  const { audioEnabled, videoEnabled, setMuted } = media;
  const sharing = Boolean(media.screenTrack);

  useEffect(() => {
    socket?.send({ type: "media-state", is_muted: !audioEnabled, is_video_on: videoEnabled });
  }, [socket, audioEnabled, videoEnabled]);

  useEffect(() => {
    socket?.send({ type: "screen-share", active: sharing });
  }, [socket, sharing]);

  useEffect(() => {
    if (!socket) return;
    return socket.on("muted-by-host", (msg) => {
      if (msg.participant_ids.includes(selfId)) {
        void setMuted(true);
        toast("The host has muted you");
      }
    });
  }, [socket, selfId, setMuted, toast]);
}
