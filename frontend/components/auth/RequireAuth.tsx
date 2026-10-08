"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/** Renders children only for signed-in users; otherwise sends them to /login and back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const current = pathname + window.location.search;
      router.replace(current === "/" ? "/login" : `/login?next=${encodeURIComponent(current)}`);
    }
  }, [loading, user, pathname, router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zoom-muted">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }
  return <>{children}</>;
}
