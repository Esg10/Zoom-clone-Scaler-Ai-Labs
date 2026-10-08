// Per-tab hand-off of join choices from the Join/Start screens to the meeting page.
// sessionStorage is tab-scoped, so a second tab joining via invite link is a guest.

export interface JoinPrefs {
  displayName?: string;
  audioOff?: boolean;
  videoOff?: boolean;
  /** True when the signed-in user is starting their own meeting. */
  asHost?: boolean;
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
