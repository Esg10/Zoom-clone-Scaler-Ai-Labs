// Typed client for the FastAPI backend. All HTTP calls go through `request`.
import type {
  ApiErrorBody,
  AuthResponse,
  JoinInput,
  JoinResponse,
  Meeting,
  MeetingSummary,
  MeetingUpdateInput,
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

// ---------- Login token (kept in localStorage so a refresh stays signed in) ----------

const TOKEN_KEY = "zoom-clone:auth-token";
/** Fired when the server rejects our token, so the auth provider can sign out. */
export const AUTH_EXPIRED_EVENT = "zoom-clone:auth-expired";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable: the session just won't survive a reload.
  }
}

async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
      body: json === undefined ? rest.body : JSON.stringify(json),
    });
  } catch {
    throw new ApiError(0, "network_error", "Can't reach the server. Check your connection and try again.");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    if (response.status === 401 && token && error?.code === "not_authenticated") {
      setAuthToken(null);
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(response.status, error?.code ?? "unknown_error", error?.message ?? "Something went wrong");
  }
  return body as T;
}

const meetingPath = (code: string) => `/api/meetings/${encodeURIComponent(code)}`;
const post = <T>(path: string, json: unknown = {}) => request<T>(path, { method: "POST", json });

/** Proves "I am this participant" for host actions and the meeting socket. */
export interface ParticipantCredentials {
  id: number;
  token: string;
}

const actorBody = (actor: ParticipantCredentials) => ({ participant_id: actor.id, participant_token: actor.token });

export const api = {
  signup: (input: { name: string; email: string; password: string }) => post<AuthResponse>("/api/auth/signup", input),
  login: (input: { email: string; password: string }) => post<AuthResponse>("/api/auth/login", input),
  logout: () => post<null>("/api/auth/logout"),
  getMe: () => request<User>("/api/users/me"),

  createInstantMeeting: (usePersonalMeetingId = false) =>
    post<Meeting>("/api/meetings/instant", { use_personal_meeting_id: usePersonalMeetingId }),
  scheduleMeeting: (input: ScheduleMeetingInput) => post<Meeting>("/api/meetings/schedule", input),
  getUpcoming: () => request<Meeting[]>("/api/meetings/upcoming"),
  getRecent: () => request<Meeting[]>("/api/meetings/recent"),
  /** Public summary; safe for guests. */
  getMeeting: (code: string) => request<MeetingSummary>(meetingPath(code)),
  /** Full details incl. passcode; owner only. */
  getMeetingDetails: (code: string) => request<Meeting>(`${meetingPath(code)}/details`),
  /** Resolves with the meeting if joinable; otherwise throws ApiError with the reason code. */
  validateMeeting: async (code: string, passcode?: string): Promise<Meeting> => {
    const result = await post<ValidateResponse>(`${meetingPath(code)}/validate`, { passcode: passcode || null });
    if (!result.ok || !result.meeting)
      throw new ApiError(200, result.error?.code ?? "unknown_error", result.error?.message ?? "Can't join");
    return result.meeting;
  },
  updateMeeting: (code: string, input: MeetingUpdateInput) =>
    request<Meeting>(meetingPath(code), { method: "PATCH", json: input }),
  cancelMeeting: (code: string) => request<Meeting>(meetingPath(code), { method: "DELETE" }),

  joinMeeting: (code: string, input: JoinInput) => post<JoinResponse>(`${meetingPath(code)}/join`, input),

  // Host controls: `actor` is the participant performing the action.
  endMeeting: (code: string, actor: ParticipantCredentials) => post<Meeting>(`${meetingPath(code)}/end`, actorBody(actor)),
  muteAll: (code: string, actor: ParticipantCredentials) => post(`${meetingPath(code)}/mute-all`, actorBody(actor)),
  muteParticipant: (code: string, actor: ParticipantCredentials, targetId: number) =>
    post(`${meetingPath(code)}/participants/${targetId}/mute`, actorBody(actor)),
  lowerHand: (code: string, actor: ParticipantCredentials, targetId: number) =>
    post(`${meetingPath(code)}/participants/${targetId}/lower-hand`, actorBody(actor)),
  lowerAllHands: (code: string, actor: ParticipantCredentials) => post(`${meetingPath(code)}/lower-all-hands`, actorBody(actor)),
  admitParticipant: (code: string, actor: ParticipantCredentials, targetId: number) =>
    post(`${meetingPath(code)}/participants/${targetId}/admit`, actorBody(actor)),
  removeParticipant: (code: string, actor: ParticipantCredentials, targetId: number) =>
    post(`${meetingPath(code)}/participants/${targetId}/remove`, actorBody(actor)),
};

export const meetingSocketUrl = (code: string, actor: ParticipantCredentials) =>
  `${WS_URL}/ws/meetings/${encodeURIComponent(code)}?participant_id=${actor.id}&token=${encodeURIComponent(actor.token)}`;
