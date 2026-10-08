// Helpers for the schedule form: time slots, durations, time zones and passcodes.
import type { SelectOption } from "@/components/ui/Select";

const pad = (n: number) => String(n).padStart(2, "0");

/** "HH:MM" every 30 minutes, labelled in 12-hour format like Zoom. */
export const TIME_OPTIONS: SelectOption[] = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 ? 30 : 0;
  return { value: `${pad(hours)}:${pad(minutes)}`, label: formatClock(hours, minutes) };
});

export function formatClock(hours: number, minutes: number): string {
  const suffix = hours < 12 ? "AM" : "PM";
  return `${hours % 12 || 12}:${pad(minutes)} ${suffix}`;
}

export const HOUR_OPTIONS: SelectOption[] = Array.from({ length: 25 }, (_, h) => ({ value: String(h), label: String(h) }));
export const MINUTE_OPTIONS: SelectOption[] = [0, 15, 30, 45].map((m) => ({ value: String(m), label: String(m) }));

export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/** All IANA zones with their current GMT offset, sorted by offset then name. */
export function timeZoneOptions(): SelectOption[] {
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [browserTimeZone(), "UTC"];
  const now = new Date();
  return zones
    .map((zone) => ({ zone, offset: gmtOffset(zone, now) }))
    .sort((a, b) => a.offset.minutes - b.offset.minutes || a.zone.localeCompare(b.zone))
    .map(({ zone, offset }) => ({ value: zone, label: `(${offset.label}) ${zone.replace(/_/g, " ")}` }));
}

function gmtOffset(timeZone: string, at: Date): { label: string; minutes: number } {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  const minutes = match ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
  return { label: match ? name : "GMT+00:00", minutes };
}

/** Wall-clock date ("YYYY-MM-DD") and time ("HH:MM") of an instant in a given zone. */
export function zonedParts(iso: string | Date, timeZone: string): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** Next :00/:30 slot from now in the given zone (Zoom's default start time). */
export function nextSlot(timeZone: string): { date: string; time: string } {
  const now = new Date();
  const next = new Date(Math.ceil((now.getTime() + 60_000) / 1_800_000) * 1_800_000);
  return zonedParts(next, timeZone);
}

const PASSCODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generatePasscode(length = 6): string {
  const random = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(random, (n) => PASSCODE_ALPHABET[n % PASSCODE_ALPHABET.length]).join("");
}

export const PASSCODE_PATTERN = /^[A-Za-z0-9]{6,10}$/;
