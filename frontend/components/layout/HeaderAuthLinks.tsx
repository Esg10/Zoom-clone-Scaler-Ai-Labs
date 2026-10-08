"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

/** Right side of the minimal header: sign-in links for guests, Home for members. */
export function HeaderAuthLinks() {
  const { user, loading } = useAuth();
  if (loading) return null;
  const linkClass = "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";
  if (user) {
    return (
      <Link href="/" className={`${linkClass} text-zoom-blue hover:bg-zoom-blue-light`}>
        Home
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Link href="/login" className={`${linkClass} text-zoom-text hover:bg-zoom-bg`}>
        Sign In
      </Link>
      <Link href="/signup" className={`${linkClass} bg-zoom-blue text-white hover:bg-zoom-blue-hover`}>
        Sign Up Free
      </Link>
    </div>
  );
}
