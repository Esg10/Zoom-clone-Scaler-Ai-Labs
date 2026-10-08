"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import type { MeetingSocket } from "@/lib/signaling";
import type { RoomParticipant } from "@/types";

/** Hosts get a notification when someone raises their hand (as in Zoom). */
export function useHandRaiseNotices(
  socket: MeetingSocket | null,
  participants: RoomParticipant[],
  isHost: boolean,
  selfId: number,
) {
  const toast = useToast();
  // Read the latest names inside the listener without re-subscribing on every update.
  const participantsRef = useRef(participants);
  participantsRef.current = participants;

  useEffect(() => {
    if (!socket || !isHost) return;
    return socket.on("hand", (msg) => {
      if (!msg.raised_at || msg.participant_id === selfId) return;
      const name = participantsRef.current.find((p) => p.id === msg.participant_id)?.display_name ?? "A participant";
      toast(`✋ ${name} raised their hand`);
    });
  }, [socket, isHost, selfId, toast]);
}
