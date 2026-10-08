"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { browserTimeZone, generatePasscode, nextSlot, PASSCODE_PATTERN, zonedParts } from "@/lib/schedule";
import type { Meeting, ScheduleMeetingInput } from "@/types";
import { useAuth } from "./useAuth";

export interface ScheduleFormValues {
  title: string;
  description: string;
  date: string;
  time: string;
  durationHours: number;
  durationMinutes: number;
  timezone: string;
  passcode: string;
  waitingRoom: boolean;
  muteOnEntry: boolean;
}

export type ScheduleFormErrors = Partial<Record<keyof ScheduleFormValues | "form", string>>;

function defaults(): ScheduleFormValues {
  const timezone = browserTimeZone();
  return {
    title: "",
    description: "",
    ...nextSlot(timezone),
    durationHours: 1,
    durationMinutes: 0,
    timezone,
    passcode: generatePasscode(),
    waitingRoom: false,
    muteOnEntry: false,
  };
}

function fromMeeting(meeting: Meeting): ScheduleFormValues {
  return {
    title: meeting.title,
    description: meeting.description ?? "",
    ...zonedParts(meeting.scheduled_start!, meeting.timezone),
    durationHours: Math.floor(meeting.duration_minutes / 60),
    durationMinutes: meeting.duration_minutes % 60,
    timezone: meeting.timezone,
    passcode: meeting.passcode,
    waitingRoom: meeting.waiting_room_enabled,
    muteOnEntry: meeting.mute_on_entry,
  };
}

function validate(values: ScheduleFormValues): ScheduleFormErrors {
  const errors: ScheduleFormErrors = {};
  if (!values.title.trim()) errors.title = "Topic is required";
  if (!values.date) errors.date = "Choose a date";
  const minutes = values.durationHours * 60 + values.durationMinutes;
  if (minutes < 15) errors.durationMinutes = "Duration must be at least 15 minutes";
  if (minutes > 24 * 60) errors.durationHours = "Duration can't exceed 24 hours";
  if (!PASSCODE_PATTERN.test(values.passcode)) errors.passcode = "Passcode must be 6–10 letters or numbers";
  return errors;
}

/** State, validation and submission for creating or editing a scheduled meeting. */
export function useScheduleForm(editCode: string | null) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [values, setValues] = useState<ScheduleFormValues>(defaults);
  const [errors, setErrors] = useState<ScheduleFormErrors>({});
  // Starts true even for new meetings: defaults depend on the browser (time zone,
  // clock, random passcode), so they're computed after mount to avoid SSR mismatch.
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meetingCode, setMeetingCode] = useState<string | null>(null);

  useEffect(() => {
    if (!editCode) {
      setValues(defaults());
      setLoading(false);
      return;
    }
    api
      .getMeetingDetails(editCode)
      .then((meeting) => {
        setValues(fromMeeting(meeting));
        setMeetingCode(meeting.meeting_code);
      })
      .catch((err) => setErrors({ form: err instanceof ApiError ? err.message : "Couldn't load the meeting" }))
      .finally(() => setLoading(false));
  }, [editCode]);

  // Default topic once the user is known (only for new meetings).
  useEffect(() => {
    if (!editCode && user) setValues((v) => (v.title ? v : { ...v, title: `${user.name}'s Zoom Meeting` }));
  }, [editCode, user]);

  const setField = <K extends keyof ScheduleFormValues>(key: K, value: ScheduleFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  };

  const submit = async () => {
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload: ScheduleMeetingInput = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      date: values.date,
      time: values.time,
      duration_minutes: values.durationHours * 60 + values.durationMinutes,
      timezone: values.timezone,
      passcode: values.passcode,
      waiting_room_enabled: values.waitingRoom,
      mute_on_entry: values.muteOnEntry,
    };
    setSaving(true);
    try {
      if (editCode) {
        await api.updateMeeting(editCode, payload);
        toast("Meeting updated", "success");
      } else {
        await api.scheduleMeeting(payload);
        toast("Meeting scheduled", "success");
      }
      router.push("/");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't save the meeting";
      setErrors(err instanceof ApiError && err.code === "start_in_past" ? { time: message } : { form: message });
      setSaving(false);
    }
  };

  return { values, errors, loading, saving, meetingCode, setField, submit };
}
