"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { meetingSocketUrl } from "@/lib/api";
import { MeetingSocket } from "@/lib/signaling";
import type { ChatMessage, Participant, RoomParticipant } from "@/types";
import type { ClientMessage, Reaction } from "@/types/realtime";

export type RoomStatus = "connecting" | "waiting" | "connected" | "removed" | "ended" | "disconnected" | "rejected";

export interface ActiveReaction {
  key: number;
  participantId: number;
  emoji: Reaction;
}

const REACTION_DURATION_MS = 4000;

/** Creates (but doesn't open) the meeting WebSocket for a joined participant. */
export function useMeetingSocket(code: string, participantId: number, token: string): MeetingSocket | null {
  const [socket, setSocket] = useState<MeetingSocket | null>(null);
  useEffect(() => {
    const instance = new MeetingSocket(meetingSocketUrl(code, { id: participantId, token }));
    setSocket(instance);
    return () => instance.close();
  }, [code, participantId, token]);
  return socket;
}

/** Room state (participants, chat, reactions, status) driven by server messages. */
export function useMeeting(socket: MeetingSocket | null) {
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [waiting, setWaiting] = useState<Participant[]>([]); // waiting room (shown to hosts)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyCount, setHistoryCount] = useState(0); // messages that existed before we joined
  const [sharerId, setSharerId] = useState<number | null>(null);
  const [reactions, setReactions] = useState<ActiveReaction[]>([]);
  const reactionKey = useRef(0);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    if (!socket) return;
    const upsert = (participant: RoomParticipant) =>
      setParticipants((current) =>
        current.some((p) => p.id === participant.id)
          ? current.map((p) => (p.id === participant.id ? participant : p))
          : [...current, participant],
      );

    const unsubscribers = [
      socket.on("welcome", (msg) => {
        setStatus("connected");
        setParticipants(msg.participants);
        setWaiting(msg.waiting);
        setMessages(msg.messages);
        setHistoryCount(msg.messages.length);
        setSharerId(msg.participants.find((p) => p.is_sharing)?.id ?? null);
      }),
      socket.on("waiting", () => setStatus("waiting")),
      socket.on("waiting-room", (msg) => setWaiting(msg.participants)),
      socket.on("participant-joined", (msg) => upsert(msg.participant)),
      socket.on("participant-updated", (msg) => upsert(msg.participant)),
      socket.on("participant-left", (msg) => {
        setParticipants((current) => current.filter((p) => p.id !== msg.participant_id));
        setSharerId((current) => (current === msg.participant_id ? null : current));
      }),
      socket.on("screen-share", (msg) => {
        setSharerId(msg.participant_id);
        setParticipants((current) => current.map((p) => ({ ...p, is_sharing: p.id === msg.participant_id })));
      }),
      socket.on("chat", (msg) => setMessages((current) => [...current, msg.message])),
      socket.on("muted-by-host", (msg) =>
        setParticipants((current) => current.map((p) => (msg.participant_ids.includes(p.id) ? { ...p, is_muted: true } : p))),
      ),
      socket.on("reaction", (msg) => {
        const key = ++reactionKey.current;
        setReactions((current) => [...current, { key, participantId: msg.participant_id, emoji: msg.emoji }]);
        setTimeout(() => setReactions((current) => current.filter((r) => r.key !== key)), REACTION_DURATION_MS);
      }),
      socket.on("removed", () => setStatus("removed")),
      socket.on("meeting-ended", () => setStatus("ended")),
      socket.on("error", (msg) => {
        // Errors before "welcome" mean the server refused the connection.
        if (statusRef.current === "connecting") {
          setStatus(msg.code === "removed" ? "removed" : "rejected");
          setStatusMessage(msg.message);
        }
      }),
      socket.onClose(() => setStatus((current) => (current === "connected" || current === "waiting" ? "disconnected" : current))),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [socket]);

  const send = useCallback((message: ClientMessage) => socket?.send(message), [socket]);

  return { status, statusMessage, participants, waiting, messages, historyCount, sharerId, reactions, send };
}

export type MeetingState = ReturnType<typeof useMeeting>;
