"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, AUTH_EXPIRED_EVENT, getAuthToken, setAuthToken } from "@/lib/api";
import type { AuthResponse, User } from "@/types";

interface AuthState {
  user: User | null;
  /** True until we know whether a stored token is still valid. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Restores the session from localStorage on load and exposes login/signup/logout. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    api
      .getMe()
      .then(setUser)
      .catch(() => setAuthToken(null)) // expired or revoked token
      .finally(() => setLoading(false));
  }, []);

  // Any request that comes back 401 signs us out everywhere.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const startSession = useCallback(({ token, user: signedIn }: AuthResponse) => {
    setAuthToken(token);
    setUser(signedIn);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => startSession(await api.login({ email, password })),
    [startSession],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => startSession(await api.signup({ name, email, password })),
    [startSession],
  );

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined); // sign out locally even if the server is unreachable
    setAuthToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, signup, logout }), [user, loading, login, signup, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
