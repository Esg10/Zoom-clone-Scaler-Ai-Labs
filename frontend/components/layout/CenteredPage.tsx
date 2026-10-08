import type { ReactNode } from "react";
import { Logo } from "./Logo";

/** Minimal page chrome used by the standalone join screens. */
export function CenteredPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center border-b border-zoom-border bg-white px-4 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
        <div className="w-full max-w-md rounded-2xl border border-zoom-border bg-white p-6 shadow-card sm:p-8">
          <h1 className="mb-6 text-center text-2xl font-semibold">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
