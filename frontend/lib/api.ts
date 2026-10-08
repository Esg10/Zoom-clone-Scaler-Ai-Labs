// Typed client for the FastAPI backend. All HTTP calls go through `request`.
import type {
  ApiErrorBody,
  JoinInput,
  JoinResponse,
  Meeting,
  MeetingUpdateInput,
  Participant,
  ScheduleMeetingInput,
  User,
  ValidateResponse,
} from "@/types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const WS_URL = (process.env.NEXT_PUBLIC_WS_URL ?? API_URL.replace(/^http/, "ws")).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: { "Content-Type": "application/json", ...rest.headers },
      body: json === undefined ? rest.body : JSON.stringify(json),
    });
  } catch {
    throw new ApiError(0, "network_error", "Can't reach the server. Check your connection and try again.");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new ApiError(response.status, error?.code ?? "unknown_error", error?.message ?? "Something went wrong");
  }
  return body as T;
}

const meetingPath = (code: string) => `/api/meetings/${encodeURIComponent(code)}`;
const post = <T>(path: string, json: unknown = {}) => request<T>(path, { method: "POST", json });

export const api = {
  getMe: () => request<User>("/api/users/me"),

  createInstantMeeting: (usePersonalMeetingId = false) =>
    post<Meeting>("/api/meetings/instant", { use_personal_meeting_id: usePersonalMeetingId }),
  scheduleMeeting: (input: ScheduleMeetingInput) => post<Meeting>("/api/meetings/schedule", input),
  getUpcoming: () => request<Meeting[]>("/api/meetings/upcoming"),
  getRecent: () => request<Meeting[]>("/api/meetings/recent"),
  getMeeting: (code: string) => request<Meeting>(meetingPath(code)),
  /** Resolves with the meeting if joinable; otherwise throws ApiError with the reason code. */
  validateMeeting: async (code: string, passcode?: string): Promise<Meeting> => {
    const result = await post<ValidateResponse>(`${meetingPath(code)}/validate`, { passcode: passcode || null });
    if (!result.ok || !result.meeting) throw new ApiError(200, result.error?.code ?? "unknown_error", result.error?.message ?? "Can't join");
    return result.meeting;
  },
  updateMeeting: (code: string, input: MeetingUpdateInput) =>
    request<Meeting>(meetingPath(code), { method: "PATCH", json: input }),
  cancelMeeting: (code: string) => request<Meeting>(meetingPath(code), { method: "DELETE" }),

  joinMeeting: (code: string, input: JoinInput) => post<JoinResponse>(`${meetingPath(code)}/join`, input),
  listParticipants: (code: string) => request<{ participants: Participant[] }>(`${meetingPath(code)}/participants`),

  // Host controls: `actorId` is the participant performing the action.
  endMeeting: (code: string, actorId: number) => post<Meeting>(`${meetingPath(code)}/end`, { participant_id: actorId }),
  muteAll: (code: string, actorId: number) => post(`${meetingPath(code)}/mute-all`, { participant_id: actorId }),
  muteParticipant: (code: string, actorId: number, targetId: number) =>
    post(`${meetingPath(code)}/participants/${targetId}/mute`, { participant_id: actorId }),
  admitParticipant: (code: string, actorId: number, targetId: number) =>
    post(`${meetingPath(code)}/participants/${targetId}/admit`, { participant_id: actorId }),
  removeParticipant: (code: string, actorId: number, targetId: number) =>
    post(`${meetingPath(code)}/participants/${targetId}/remove`, { participant_id: actorId }),
};

export const meetingSocketUrl = (code: string, participantId: number) =>
  `${WS_URL}/ws/meetings/${encodeURIComponent(code)}?participant_id=${participantId}`;
