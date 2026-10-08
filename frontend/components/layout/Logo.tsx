import Link from "next/link";
import { Video } from "lucide-react";

/** Original camera-badge wordmark (deliberately not Zoom's logo artwork). */
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Zoom Clone home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zoom-blue">
        <Video className="h-[18px] w-[18px] fill-white text-white" aria-hidden />
      </span>
      <span className="text-[22px] font-extrabold tracking-tight text-zoom-blue">zoom</span>
      <span className="hidden rounded bg-zoom-blue-light px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zoom-blue lg:inline">
        clone
      </span>
    </Link>
  );
}
