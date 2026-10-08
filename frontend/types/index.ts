// Mirrors backend/app/schemas.py. Datetimes are ISO-8601 UTC strings.

export type MeetingType = "instant" | "scheduled";
export type MeetingStatus = "scheduled" | "live" | "ended" | "cancelled";
export type ParticipantRole = "host" | "co_host" | "attendee";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_color: string;
  personal_meeting_id: string;
  created_at: string;
}

export interface Meeting {
  id: number;
  meeting_code: string;
  title: string;
  description: string | null;
  host_id: number;
  host_name: string;
  type: MeetingType;
  status: MeetingStatus;
  scheduled_start: string | null;
  duration_minutes: number;
  timezone: string;
  passcode: string;
  invite_link: string;
  waiting_room_enabled: boolean;
  mute_on_entry: boolean;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  participant_count: number;
}

export interface ScheduleMeetingInput {
  title: string;
  description?: string | null;
  date: string; // YYYY-MM-DD, wall-clock in `timezone`
  time: string; // HH:MM, wall-clock in `timezone`
  duration_minutes: number;
  timezone: string;
  passcode?: string;
  waiting_room_enabled: boolean;
  mute_on_entry: boolean;
}

export type MeetingUpdateInput = Partial<ScheduleMeetingInput>;

export interface ValidateResponse {
  ok: boolean;
  meeting: Meeting | null;
  error: { code: string; message: string } | null;
}

export interface Participant {
  id: number;
  meeting_id: number;
  user_id: number | null;
  display_name: string;
  role: ParticipantRole;
  joined_at: string;
  left_at: string | null;
  is_muted: boolean;
  is_video_on: boolean;
  is_removed: boolean;
  is_admitted: boolean;
}

/** Participant as seen inside a live room (adds ephemeral realtime state). */
export interface RoomParticipant extends Participant {
  is_sharing: boolean;
}

export interface JoinInput {
  display_name: string;
  passcode?: string;
  is_video_on: boolean;
}

export interface JoinResponse {
  participant: Participant;
  meeting: Meeting;
  /** Secret for this participant; required by the WebSocket and host actions. */
  participant_token: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ChatMessage {
  id: number;
  participant_id: number;
  sender_name: string;
  content: string;
  sent_at: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
