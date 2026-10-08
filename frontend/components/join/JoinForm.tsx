"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api, ApiError } from "@/lib/api";
import { saveJoinPrefs } from "@/lib/joinPrefs";
import { parseMeetingInput } from "@/lib/utils";

interface JoinFormProps {
  shareScreen?: boolean;
  onCancel?: () => void;
}

interface FieldErrors {
  meeting?: string;
  passcode?: string;
  general?: string;
}

const PASSCODE_ERRORS = new Set(["passcode_required", "invalid_passcode"]);
const MEETING_ERRORS = new Set(["meeting_not_found", "meeting_ended", "meeting_cancelled"]);

/** Join by meeting ID or invite link; validates server-side before navigating. */
export function JoinForm({ shareScreen = false, onCancel }: JoinFormProps) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [meetingInput, setMeetingInput] = useState("");
  const [passcode, setPasscode] = useState("");
  const [name, setName] = useState("");
  const [audioOff, setAudioOff] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && !name) setName(user.name);
  }, [user, name]);

  const parsed = useMemo(() => parseMeetingInput(meetingInput), [meetingInput]);
  const linkHasPasscode = Boolean(parsed?.passcode);
  const effectivePasscode = parsed?.passcode ?? passcode.trim();
  const canSubmit = Boolean(parsed && name.trim() && effectivePasscode) && !submitting;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!parsed) return;
    setSubmitting(true);
    setErrors({});
    try {
      await api.validateMeeting(parsed.code, effectivePasscode);
      saveJoinPrefs(parsed.code, { displayName: name.trim(), audioOff, videoOff, shareOnJoin: shareScreen });
      router.push(`/meeting/${parsed.code}?pwd=${encodeURIComponent(effectivePasscode)}`);
    } catch (err) {
      setSubmitting(false);
      if (!(err instanceof ApiError)) return setErrors({ general: "Something went wrong. Please try again." });
      if (MEETING_ERRORS.has(err.code)) setErrors({ meeting: err.message });
      else if (PASSCODE_ERRORS.has(err.code))
        setErrors(linkHasPasscode ? { meeting: "The passcode in this invite link is incorrect." } : { passcode: err.message });
      else setErrors({ general: err.message });
    }
  };

  const meetingHint = parsed
    ? linkHasPasscode
      ? "Invite link detected — passcode included"
      : undefined
    : "Paste an invite link or enter the 10–11 digit meeting ID";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Meeting ID or invite link"
        placeholder="Enter meeting ID or invite link"
        value={meetingInput}
        onChange={(event) => setMeetingInput(event.target.value)}
        error={errors.meeting ?? (meetingInput && !parsed ? "Enter a valid meeting ID or invite link" : null)}
        hint={meetingHint}
        autoFocus
        autoComplete="off"
      />
      {!linkHasPasscode && (
        <Input
          label="Meeting passcode"
          placeholder="Enter meeting passcode"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          error={errors.passcode}
          autoComplete="off"
        />
      )}
      <Input label="Your name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} />
      <div className="flex flex-col gap-2.5">
        <Checkbox label="Don't connect to audio" checked={audioOff} onChange={(event) => setAudioOff(event.target.checked)} />
        <Checkbox label="Turn off my video" checked={videoOff} onChange={(event) => setVideoOff(event.target.checked)} />
      </div>
      {errors.general && (
        <p role="alert" className="text-sm text-zoom-red">
          {errors.general}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!canSubmit} loading={submitting} className="min-w-24">
          Join
        </Button>
      </div>
    </form>
  );
}
