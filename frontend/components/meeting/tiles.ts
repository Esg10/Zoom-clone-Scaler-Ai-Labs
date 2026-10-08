import type { ActiveReaction } from "@/hooks/useMeeting";
import type { MediaControls } from "@/hooks/useMediaDevices";
import type { Participant, RoomParticipant } from "@/types";
import type { TileData } from "./VideoTile";

interface BuildTilesInput {
  self: Participant;
  participants: RoomParticipant[];
  remoteStreams: Record<number, MediaStream>;
  media: MediaControls;
  reactions: ActiveReaction[];
}

/** Combine server participant state with local/remote media into render-ready tiles (me first). */
export function buildTiles({ self, participants, remoteStreams, media, reactions }: BuildTilesInput): TileData[] {
  const latestReaction = new Map(reactions.map((r) => [r.participantId, r.emoji]));
  const selfTile: TileData = {
    id: self.id,
    name: self.display_name,
    stream: media.previewStream,
    videoOn: media.videoEnabled,
    audioMuted: !media.audioEnabled,
    isSelf: true,
    isHost: self.role === "host",
    isSharing: Boolean(media.screenTrack),
    reaction: latestReaction.get(self.id),
  };
  const others = participants
    .filter((p) => p.id !== self.id)
    .map<TileData>((p) => ({
      id: p.id,
      name: p.display_name,
      stream: remoteStreams[p.id] ?? null,
      videoOn: p.is_video_on,
      audioMuted: p.is_muted,
      isSelf: false,
      isHost: p.role === "host",
      isSharing: p.is_sharing,
      reaction: latestReaction.get(p.id),
    }));
  return [selfTile, ...others];
}
