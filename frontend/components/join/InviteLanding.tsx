"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api";
import { saveJoinPrefs } from "@/lib/joinPrefs";
import { formatMeetingId } from "@/lib/utils";
import type { Meeting } from "@/types";

const NAME_KEY = "zoom-clone:display-name";
const PASSCODE_ERRORS = new Set(["passcode_required", "invalid_passcode"]);

type Status = { kind: "loading" } | { kind: "ready"; meeting?: Meeting } | { kind: "fatal"; message: string };

/** Entry point for invite links (/j/:code?pwd=...): only asks for a display name. */
export function InviteLanding({ code, linkPasscode }: { code: string; linkPasscode: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState(linkPasscode);
  const [needsPasscode, setNeedsPasscode] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      // No stored name; the field simply starts empty.
    }
    api
      .validateMeeting(code, linkPasscode)
      .then(({ meeting }) => setStatus({ kind: "ready", meeting }))
      .catch((err) => {
        if (err instanceof ApiError && PASSCODE_ERRORS.has(err.code)) {
          // Link without (or with a stale) passcode: ask for it instead of failing.
          setNeedsPasscode(true);
          setPasscodeError(linkPasscode ? err.message : null);
          setStatus({ kind: "ready" });
        } else {
          setStatus({ kind: "fatal", message: err instanceof ApiError ? err.message : "Couldn't open this meeting link." });
        }
      });
  }, [code, linkPasscode]);

  const join = async (event: FormEvent) => {
    event.preventDefault();
    setJoining(true);
    try {
      if (needsPasscode) await api.validateMeeting(code, passcode.trim());
      try {
        localStorage.setItem(NAME_KEY, name.trim());
      } catch {
        // Name just won't be remembered next time.
      }
      saveJoinPrefs(code, { displayName: name.trim() });
      router.push(`/meeting/${code}?pwd=${encodeURIComponent(passcode.trim())}`);
    } catch (err) {
      setPasscodeError(err instanceof ApiError ? err.message : "Couldn't verify the passcode");
      setJoining(false);
    }
  };

  if (status.kind === "loading") {
    return (
      <div className="space-y-3">
        <Skeleton className="mx-auto h-4 w-2/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (status.kind === "fatal") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-zoom-red" aria-hidden />
        <p className="text-sm text-zoom-muted">{status.message}</p>
        <Link href="/" className="text-sm font-medium text-zoom-blue hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={join} className="flex flex-col gap-4">
      <div className="rounded-xl bg-zoom-bg px-4 py-3 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          <CalendarClock className="h-4 w-4 text-zoom-blue" aria-hidden />
          {status.meeting?.title ?? "Zoom meeting"}
        </p>
        <p className="mt-0.5 text-xs text-zoom-muted">
          Meeting ID: {formatMeetingId(code)}
          {status.meeting && <> · Host: {status.meeting.host_name}</>}
        </p>
      </div>
      <Input label="Your name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
      {needsPasscode && (
        <Input
          label="Meeting passcode"
          value={passcode}
          onChange={(e) => {
            setPasscode(e.target.value);
            setPasscodeError(null);
          }}
          error={passcodeError}
        />
      )}
      <Button type="submit" size="lg" disabled={!name.trim() || (needsPasscode && !passcode.trim())} loading={joining}>
        Join
      </Button>
    </form>
  );
}
