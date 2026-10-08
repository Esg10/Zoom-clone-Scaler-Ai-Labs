"use client";

import { useElementSize } from "@/hooks/useElementSize";
import { ASPECT, bestLayout } from "./VideoGrid";
import { VideoTile, type TileData } from "./VideoTile";

interface SpeakerViewProps {
  tiles: TileData[];
  focusId: number;
  activeSpeakerId: number | null;
}

/** One large tile (screen share or active speaker) with a thumbnail strip on top. */
export function SpeakerView({ tiles, focusId, activeSpeakerId }: SpeakerViewProps) {
  const focus = tiles.find((t) => t.id === focusId) ?? tiles[0];
  const others = tiles.filter((t) => t.id !== focus.id);
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { tileWidth } = bestLayout(1, width, height);

  return (
    <div className="flex h-full w-full flex-col gap-2">
      {others.length > 0 && (
        <div className="scrollbar-thin flex shrink-0 justify-center gap-2 overflow-x-auto">
          {others.map((tile) => (
            <VideoTile
              key={tile.id}
              tile={tile}
              variant="strip"
              speaking={tile.id === activeSpeakerId}
              className="h-[72px] w-32 sm:h-24 sm:w-[170px]"
            />
          ))}
        </div>
      )}
      <div ref={ref} className="flex min-h-0 flex-1 items-center justify-center">
        {width > 0 && (
          <VideoTile tile={focus} variant="focus" speaking={false} style={{ width: tileWidth, height: tileWidth / ASPECT }} />
        )}
      </div>
    </div>
  );
}
