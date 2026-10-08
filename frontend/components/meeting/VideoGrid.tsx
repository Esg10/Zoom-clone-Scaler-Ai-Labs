"use client";

import { useElementSize } from "@/hooks/useElementSize";
import { VideoTile, type TileData } from "./VideoTile";

const GAP = 8;
export const ASPECT = 16 / 9;

/** Pick the column count that gives the largest 16:9 tiles inside the area. */
export function bestLayout(count: number, width: number, height: number) {
  let best = { cols: 1, tileWidth: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const byWidth = (width - GAP * (cols - 1)) / cols;
    const byHeight = ((height - GAP * (rows - 1)) / rows) * ASPECT;
    const tileWidth = Math.min(byWidth, byHeight);
    if (tileWidth > best.tileWidth) best = { cols, tileWidth };
  }
  return best;
}

interface VideoGridProps {
  tiles: TileData[];
  activeSpeakerId: number | null;
}

/** Gallery view: every participant in an evenly sized grid that resizes with the count. */
export function VideoGrid({ tiles, activeSpeakerId }: VideoGridProps) {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { cols, tileWidth } = bestLayout(tiles.length, width, height);

  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center overflow-hidden">
      {width > 0 && (
        <div className="flex flex-wrap content-center justify-center" style={{ gap: GAP, width: cols * tileWidth + GAP * (cols - 1) }}>
          {tiles.map((tile) => (
            <VideoTile
              key={tile.id}
              tile={tile}
              speaking={tile.id === activeSpeakerId && tiles.length > 1}
              style={{ width: tileWidth, height: tileWidth / ASPECT }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
