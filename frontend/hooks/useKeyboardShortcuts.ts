"use client";

import { useEffect, useRef } from "react";

/**
 * Binds Alt+<key> shortcuts, e.g. { KeyA: toggleMute }. Uses `event.code` so it
 * works on macOS, where Option+A types "å" instead of "a".
 */
export function useAltShortcuts(bindings: Record<string, () => void>): void {
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const handler = bindingsRef.current[event.code];
      if (handler) {
        event.preventDefault();
        handler();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
