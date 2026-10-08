"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { User } from "@/types";

interface CurrentUserState {
  user: User | null;
  loading: boolean;
}

const CurrentUserContext = createContext<CurrentUserState>({ user: null, loading: true });

/** Loads the default signed-in user once and shares it app-wide. */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CurrentUserState>({ user: null, loading: true });

  useEffect(() => {
    api
      .getMe()
      .then((user) => setState({ user, loading: false }))
      .catch(() => setState({ user: null, loading: false }));
  }, []);

  return <CurrentUserContext.Provider value={state}>{children}</CurrentUserContext.Provider>;
}

export const useCurrentUser = () => useContext(CurrentUserContext);
