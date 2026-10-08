"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Meeting } from "@/types";

interface MeetingLists {
  upcoming: Meeting[];
  recent: Meeting[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Fetches the signed-in user's upcoming and recent meetings. */
export function useMeetingLists(): MeetingLists {
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextUpcoming, nextRecent] = await Promise.all([api.getUpcoming(), api.getRecent()]);
      setUpcoming(nextUpcoming);
      setRecent(nextRecent);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { upcoming, recent, loading, error, refresh };
}
