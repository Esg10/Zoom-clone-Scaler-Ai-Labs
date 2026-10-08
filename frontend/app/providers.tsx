"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { CurrentUserProvider } from "@/hooks/useCurrentUser";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CurrentUserProvider>{children}</CurrentUserProvider>
    </ToastProvider>
  );
}
