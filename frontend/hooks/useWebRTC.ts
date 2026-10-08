"use client";

import { useEffect, useRef, useState } from "react";
import type { MeetingSocket } from "@/lib/signaling";
import { PeerManager } from "@/lib/webrtc";

/**
 * Wires a PeerManager to the signaling socket and keeps outgoing tracks in sync.
 * Returns the remote MediaStream for each connected participant id.
 */
export function useWebRTC(
  socket: MeetingSocket | null,
  audioTrack: MediaStreamTrack | null,
  videoTrack: MediaStreamTrack | null,
): Record<number, MediaStream> {
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  const managerRef = useRef<PeerManager | null>(null);
  const tracksRef = useRef({ audioTrack, videoTrack });
  tracksRef.current = { audioTrack, videoTrack };

  useEffect(() => {
    if (!socket) return;
    const manager = new PeerManager({
      sendSignal: (to, data) => socket.send({ type: "signal", to, data }),
      onRemoteStream: (peerId, stream) => setRemoteStreams((current) => ({ ...current, [peerId]: stream })),
      onPeerClosed: (peerId) =>
        setRemoteStreams((current) => {
          const { [peerId]: _removed, ...rest } = current;
          return rest;
        }),
    });
    void manager.setTrack("audio", tracksRef.current.audioTrack);
    void manager.setTrack("video", tracksRef.current.videoTrack);
    managerRef.current = manager;

    const warn = (err: unknown) => console.warn("WebRTC negotiation failed", err);
    const unsubscribers = [
      // We are the newcomer: offer to everyone already in the room.
      socket.on("welcome", (msg) => {
        msg.participants.filter((p) => p.id !== msg.self_id).forEach((p) => manager.connect(p.id).catch(warn));
      }),
      socket.on("signal", (msg) => void manager.handleSignal(msg.from, msg.data).catch(warn)),
      socket.on("participant-left", (msg) => manager.close(msg.participant_id)),
    ];
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      manager.closeAll();
      managerRef.current = null;
    };
  }, [socket]);

  useEffect(() => {
    void managerRef.current?.setTrack("audio", audioTrack);
  }, [audioTrack]);

  useEffect(() => {
    void managerRef.current?.setTrack("video", videoTrack);
  }, [videoTrack]);

  return remoteStreams;
}
