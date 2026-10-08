"use client";

import { useMemo } from "react";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";

/** Host-only REST calls; results reach everyone through WebSocket events. */
export function useHostActions(code: string, selfId: number) {
  const toast = useToast();

  return useMemo(() => {
    const run = async (action: () => Promise<unknown>, success?: string) => {
      try {
        await action();
        if (success) toast(success, "success");
      } catch (err) {
        toast(err instanceof ApiError ? err.message : "Action failed", "error");
      }
    };
    return {
      muteAll: () => run(() => api.muteAll(code, selfId), "Everyone has been muted"),
      mute: (id: number) => run(() => api.muteParticipant(code, selfId, id)),
      remove: (id: number) => run(() => api.removeParticipant(code, selfId, id), "Participant removed"),
      endForAll: () => run(() => api.endMeeting(code, selfId)),
    };
  }, [code, selfId, toast]);
}
