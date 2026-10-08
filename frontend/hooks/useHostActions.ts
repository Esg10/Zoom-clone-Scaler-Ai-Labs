"use client";

import { useMemo } from "react";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";

/** Host-only REST calls; results reach everyone through WebSocket events. */
export function useHostActions(code: string, selfId: number, token: string) {
  const toast = useToast();

  return useMemo(() => {
    const actor = { id: selfId, token };
    const run = async (action: () => Promise<unknown>, success?: string) => {
      try {
        await action();
        if (success) toast(success, "success");
      } catch (err) {
        toast(err instanceof ApiError ? err.message : "Action failed", "error");
      }
    };
    return {
      muteAll: () => run(() => api.muteAll(code, actor), "Everyone has been muted"),
      mute: (id: number) => run(() => api.muteParticipant(code, actor, id)),
      lowerHand: (id: number) => run(() => api.lowerHand(code, actor, id)),
      lowerAllHands: () => run(() => api.lowerAllHands(code, actor), "All hands lowered"),
      admit: (id: number) => run(() => api.admitParticipant(code, actor, id)),
      remove: (id: number) => run(() => api.removeParticipant(code, actor, id), "Participant removed"),
      endForAll: () => run(() => api.endMeeting(code, actor)),
    };
  }, [code, selfId, token, toast]);
}
