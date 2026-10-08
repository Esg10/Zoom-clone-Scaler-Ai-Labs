"use client";

import { useClock } from "@/hooks/useClock";
import { formatLongDate, formatTime } from "@/lib/utils";

/** Large current time/date over a soft abstract banner (drawn in SVG, no image assets). */
export function ClockBanner() {
  const now = useClock();
  return (
    <div className="relative h-40 overflow-hidden rounded-t-2xl bg-gradient-to-br from-[#1C3FAA] via-[#2F6BFF] to-[#6EA0FF] sm:h-44">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 180" preserveAspectRatio="none" aria-hidden>
        <circle cx="330" cy="40" r="70" fill="white" opacity="0.08" />
        <circle cx="370" cy="10" r="40" fill="white" opacity="0.08" />
        <path d="M0 130 C 80 95, 160 150, 240 120 S 360 90, 400 110 L400 180 L0 180 Z" fill="white" opacity="0.10" />
        <path d="M0 150 C 90 125, 190 175, 280 145 S 370 130, 400 140 L400 180 L0 180 Z" fill="white" opacity="0.12" />
      </svg>
      <div className="relative flex h-full flex-col justify-center px-6 text-white">
        <p className="text-4xl font-semibold tracking-tight sm:text-5xl" suppressHydrationWarning>
          {now ? formatTime(now) : " "}
        </p>
        <p className="mt-1 text-sm text-white/85 sm:text-base">{now ? formatLongDate(now) : " "}</p>
      </div>
    </div>
  );
}
