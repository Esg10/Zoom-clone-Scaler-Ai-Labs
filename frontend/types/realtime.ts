// WebSocket protocol shared with backend/app/services/realtime_service.py.
import type { ChatMessage, Meeting, Participant, RoomParticipant } from "./index";

/** WebRTC negotiation payload relayed verbatim by the server. */
export type SignalData =
  | { kind: "description"; description: RTCSessionDescriptionInit }
  | { kind: "candidate"; candidate: RTCIceCandidateInit };

export const REACTIONS = ["👏", "👍", "❤️", "😂", "😮", "🎉"] as const;
export type Reaction = (typeof REACTIONS)[number];

export type ServerMessage =
  | {
      type: "welcome";
      self_id: number;
      meeting: Meeting;
      participants: RoomParticipant[];
      waiting: Participant[];
      messages: ChatMessage[];
    }
  | { type: "waiting" }
  | { type: "waiting-room"; participants: Participant[] }
  | { type: "participant-joined"; participant: RoomParticipant }
  | { type: "participant-left"; participant_id: number }
  | { type: "participant-updated"; participant: RoomParticipant }
  | { type: "signal"; from: number; data: SignalData }
  | { type: "screen-share"; participant_id: number | null }
  | { type: "chat"; message: ChatMessage }
  | { type: "reaction"; participant_id: number; emoji: Reaction }
  | { type: "hand"; participant_id: number; raised_at: string | null }
  | { type: "muted-by-host"; participant_ids: number[] }
  | { type: "removed" }
  | { type: "meeting-ended" }
  | { type: "error"; code: string; message: string };

export type ClientMessage =
  | { type: "signal"; to: number; data: SignalData }
  | { type: "media-state"; is_muted?: boolean; is_video_on?: boolean }
  | { type: "screen-share"; active: boolean }
  | { type: "chat"; content: string }
  | { type: "reaction"; emoji: Reaction }
  | { type: "hand"; raised: boolean };

export type ServerMessageType = ServerMessage["type"];
export type ServerMessageOf<T extends ServerMessageType> = Extract<ServerMessage, { type: T }>;
