"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { saveJoinPrefs } from "@/lib/joinPrefs";
import { copyText, invitationText } from "@/lib/utils";
import type { Meeting } from "@/types";
import { useAuth } from "./useAuth";

/** Dashboard/Meetings-page actions shared by several components. */
export function useMeetingActions() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const startInstant = useCallback(
    async (options: { withVideo: boolean; usePersonalId: boolean }) => {
      try {
        const meeting = await api.createInstantMeeting(options.usePersonalId);
        saveJoinPrefs(meeting.meeting_code, {
          displayName: user?.name,
          videoOff: !options.withVideo,
          showInvite: true,
        });
        router.push(`/meeting/${meeting.meeting_code}`);
      } catch (err) {
        toast(err instanceof ApiError ? err.message : "Couldn't start a meeting", "error");
      }
    },
    [router, toast, user],
  );

  /** Host starts one of their own scheduled meetings. */
  const startMeeting = useCallback(
    (meeting: Meeting) => {
      saveJoinPrefs(meeting.meeting_code, { displayName: user?.name });
      router.push(`/meeting/${meeting.meeting_code}`);
    },
    [router, user],
  );

  const copyInvitation = useCallback(
    async (meeting: Meeting) => {
      const ok = await copyText(invitationText(meeting));
      toast(ok ? "Invitation copied to clipboard" : "Couldn't access the clipboard", ok ? "success" : "error");
    },
    [toast],
  );

  const cancelMeeting = useCallback(
    async (meeting: Meeting) => {
      try {
        await api.cancelMeeting(meeting.meeting_code);
        toast("Meeting deleted", "success");
        return true;
      } catch (err) {
        toast(err instanceof ApiError ? err.message : "Couldn't delete the meeting", "error");
        return false;
      }
    },
    [toast],
  );

  const editMeeting = useCallback((meeting: Meeting) => router.push(`/schedule?edit=${meeting.meeting_code}`), [router]);

  return { startInstant, startMeeting, copyInvitation, cancelMeeting, editMeeting };
}
