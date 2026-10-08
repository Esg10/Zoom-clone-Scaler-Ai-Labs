// Small, framework-free helpers: formatting meeting IDs, dates and names.
import type { Meeting } from "@/types";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** "84512367901" -> "845 1236 7901", "4815162342" -> "481 516 2342" (Zoom's grouping). */
export function formatMeetingId(code: string): string {
  const digits = code.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (digits.length === 9) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return digits;
}

export interface ParsedMeetingInput {
  code: string;
  passcode?: string;
}

/**
 * Accepts either a bare meeting ID ("845 1236 7901", "845-1236-7901") or an
 * invite link (".../j/84512367901?pwd=abc123") and extracts the code + passcode.
 */
export function parseMeetingInput(raw: string): ParsedMeetingInput | null {
  const value = raw.trim();
  if (!value) return null;

  const linkMatch = value.match(/\/j\/(\d{9,11})(?:\?(.*))?/);
  if (linkMatch) {
    const passcode = new URLSearchParams(linkMatch[2] ?? "").get("pwd") ?? undefined;
    return { code: linkMatch[1], passcode };
  }

  const digits = value.replace(/[\s-]/g, "");
  return /^\d{9,11}$/.test(digits) ? { code: digits } : null;
}

// ---------- Dates (always rendered in the viewer's local time zone) ----------

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const shortDayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const longDateFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

export const formatTime = (date: Date | string) => timeFormat.format(new Date(date));
export const formatLongDate = (date: Date) => longDateFormat.format(date);

export function addMinutes(date: Date | string, minutes: number): Date {
  return new Date(new Date(date).getTime() + minutes * 60_000);
}

export function formatTimeRange(start: string, durationMinutes: number): string {
  return `${formatTime(start)} - ${formatTime(addMinutes(start, durationMinutes))}`;
}

/** Local calendar day key, used to group meetings by date. */
export function dayKey(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDayLabel(date: Date | string): string {
  const offsetDays = (days: number) => dayKey(new Date(Date.now() + days * 86_400_000));
  const key = dayKey(date);
  if (key === offsetDays(0)) return "Today";
  if (key === offsetDays(1)) return "Tomorrow";
  if (key === offsetDays(-1)) return "Yesterday";
  return shortDayFormat.format(new Date(date));
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins} min`;
  return mins ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function groupByDay<T>(items: T[], getDate: (item: T) => string): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = dayKey(getDate(item));
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups.entries());
}

/** Start time used for display: scheduled start, else actual start. */
export const meetingStart = (meeting: Meeting) => meeting.scheduled_start ?? meeting.started_at ?? meeting.created_at;

// ---------- People ----------

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const AVATAR_COLORS = ["#0B5CFF", "#E8590C", "#2F9E44", "#AE3EC9", "#1098AD", "#D6336C", "#5C7CFA", "#F59F00"];

/** Deterministic color so a guest keeps the same avatar color for everyone. */
export function colorForName(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ---------- Clipboard / invitations ----------

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function invitationText(meeting: Meeting): string {
  const kind = meeting.type === "scheduled" ? "a scheduled" : "a";
  const lines = [`${meeting.host_name} is inviting you to ${kind} Zoom meeting.`, "", `Topic: ${meeting.title}`];
  if (meeting.scheduled_start) {
    lines.push(
      `Time: ${formatDayLabel(meeting.scheduled_start)}, ${formatTimeRange(meeting.scheduled_start, meeting.duration_minutes)}`,
    );
  }
  lines.push(
    "",
    "Join Zoom Meeting",
    meeting.invite_link,
    "",
    `Meeting ID: ${formatMeetingId(meeting.meeting_code)}`,
    `Passcode: ${meeting.passcode}`,
  );
  return lines.join("\n");
}
