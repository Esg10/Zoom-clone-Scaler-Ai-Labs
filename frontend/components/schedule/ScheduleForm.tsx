"use client";

import { useRouter } from "next/navigation";
import { useMemo, type FormEvent } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useScheduleForm } from "@/hooks/useScheduleForm";
import { formatMeetingId } from "@/lib/utils";
import { generatePasscode, HOUR_OPTIONS, MINUTE_OPTIONS, TIME_OPTIONS, timeZoneOptions, formatClock } from "@/lib/schedule";
import { FormRow } from "./FormRow";

const controlClass =
  "h-10 w-full rounded-lg border border-zoom-border bg-white px-3 text-sm outline-none focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20";

export function ScheduleForm({ editCode }: { editCode: string | null }) {
  const router = useRouter();
  const { user } = useAuth();
  const { values, errors, loading, saving, meetingCode, setField, submit } = useScheduleForm(editCode);
  const zones = useMemo(() => (loading ? [] : timeZoneOptions()), [loading]);

  // An edited meeting may start off the 30-minute grid; keep its time selectable.
  const timeOptions = useMemo(() => {
    if (TIME_OPTIONS.some((o) => o.value === values.time)) return TIME_OPTIONS;
    const [h, m] = values.time.split(":").map(Number);
    return [...TIME_OPTIONS, { value: values.time, label: formatClock(h, m) }].sort((a, b) => a.value.localeCompare(b.value));
  }, [values.time]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  if (loading) return <ListSkeleton rows={5} />;

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormRow label="Topic" htmlFor="topic" error={errors.title}>
        <input
          id="topic"
          className={controlClass}
          value={values.title}
          maxLength={200}
          onChange={(e) => setField("title", e.target.value)}
        />
      </FormRow>

      <FormRow label="Description (Optional)" htmlFor="description">
        <textarea
          id="description"
          rows={3}
          maxLength={2000}
          placeholder="Enter your meeting description"
          className={`${controlClass} h-auto py-2`}
          value={values.description}
          onChange={(e) => setField("description", e.target.value)}
        />
      </FormRow>

      <FormRow label="When" htmlFor="date" error={errors.date ?? errors.time}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="date"
            type="date"
            className={`${controlClass} sm:w-48`}
            value={values.date}
            onChange={(e) => setField("date", e.target.value)}
          />
          <Select
            aria-label="Start time"
            className="sm:w-40"
            options={timeOptions}
            value={values.time}
            onChange={(e) => setField("time", e.target.value)}
          />
        </div>
      </FormRow>

      <FormRow label="Duration" error={errors.durationHours ?? errors.durationMinutes}>
        <div className="flex items-center gap-2 text-sm text-zoom-muted">
          <Select
            aria-label="Duration hours"
            className="w-20"
            options={HOUR_OPTIONS}
            value={String(values.durationHours)}
            onChange={(e) => setField("durationHours", Number(e.target.value))}
          />
          hr
          <Select
            aria-label="Duration minutes"
            className="w-20"
            options={MINUTE_OPTIONS}
            value={String(values.durationMinutes)}
            onChange={(e) => setField("durationMinutes", Number(e.target.value))}
          />
          min
        </div>
      </FormRow>

      <FormRow label="Time Zone" htmlFor="timezone">
        <Select
          id="timezone"
          className="sm:max-w-md"
          options={zones}
          value={values.timezone}
          onChange={(e) => setField("timezone", e.target.value)}
        />
      </FormRow>

      <FormRow label="Meeting ID">
        <div className="flex flex-col gap-2 pt-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked readOnly className="accent-zoom-blue" />
            {meetingCode ? formatMeetingId(meetingCode) : "Generate Automatically"}
          </label>
          {!meetingCode && user && (
            <label className="flex items-center gap-2 text-zoom-muted" title="Personal Meeting ID is used for instant meetings">
              <input type="radio" disabled className="accent-zoom-blue" />
              Personal Meeting ID {formatMeetingId(user.personal_meeting_id)}
            </label>
          )}
        </div>
      </FormRow>

      <FormRow label="Security" error={errors.passcode}>
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <div className="w-48">
              <Input
                label="Passcode"
                value={values.passcode}
                maxLength={10}
                onChange={(e) => setField("passcode", e.target.value.trim())}
              />
            </div>
            <Button
              variant="ghost"
              size="md"
              aria-label="Generate new passcode"
              title="Generate new passcode"
              onClick={() => setField("passcode", generatePasscode())}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-zoom-muted">Only users who have the invite link or passcode can join the meeting.</p>
          <Checkbox
            label="Waiting Room"
            description="Only users admitted by the host can join the meeting"
            checked={values.waitingRoom}
            onChange={(e) => setField("waitingRoom", e.target.checked)}
          />
        </div>
      </FormRow>

      <FormRow label="Options">
        <div className="pt-2">
          <Checkbox
            label="Mute participants upon entry"
            checked={values.muteOnEntry}
            onChange={(e) => setField("muteOnEntry", e.target.checked)}
          />
        </div>
      </FormRow>

      {errors.form && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-zoom-red">
          {errors.form}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-6 md:pl-[204px] md:justify-start">
        <Button type="submit" loading={saving} className="min-w-24">
          Save
        </Button>
        <Button variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
