// Per-tab hand-off of join choices from the Join/Start screens to the meeting page.
// (Name, audio/video choices, show-invite.) Who is host is decided by the server from the login.

export interface JoinPrefs {
  displayName?: string;
  audioOff?: boolean;
  videoOff?: boolean;
  /** Show the invite dialog once the room opens (new instant meetings). */
  showInvite?: boolean;
  /** Came from the dashboard "Share Screen" tile: prompt to share after joining. */
  shareOnJoin?: boolean;
}

const key = (code: string) => `zoom-clone:join:${code}`;

export function saveJoinPrefs(code: string, prefs: JoinPrefs): void {
  try {
    sessionStorage.setItem(key(code), JSON.stringify(prefs));
  } catch {
    // Storage can be unavailable (private mode); defaults will be used instead.
  }
}

export function loadJoinPrefs(code: string): JoinPrefs {
  try {
    return JSON.parse(sessionStorage.getItem(key(code)) ?? "{}") as JoinPrefs;
  } catch {
    return {};
  }
}
