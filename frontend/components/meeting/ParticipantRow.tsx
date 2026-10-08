import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { RoomParticipant } from "@/types";

interface ParticipantRowProps {
  participant: RoomParticipant;
  isSelf: boolean;
  canModerate: boolean;
  onMute: () => void;
  onLowerHand: () => void;
  onRemove: () => void;
}

function roleLabel(participant: RoomParticipant, isSelf: boolean): string {
  const tags = [];
  if (participant.role === "host") tags.push("Host");
  if (participant.role === "co_host") tags.push("Co-host");
  if (isSelf) tags.push("me");
  return tags.length ? ` (${tags.join(", ")})` : "";
}

export function ParticipantRow({ participant, isSelf, canModerate, onMute, onLowerHand, onRemove }: ParticipantRowProps) {
  const showActions = canModerate && !isSelf;
  const handRaised = Boolean(participant.hand_raised_at);
  return (
    <li className="group flex items-center gap-3 px-4 py-2 hover:bg-room-hover">
      <Avatar name={participant.display_name} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm">
        {participant.display_name}
        <span className="text-room-muted">{roleLabel(participant, isSelf)}</span>
      </span>
      {handRaised && (
        <span role="img" aria-label="Hand raised" className="text-base">
          ✋
        </span>
      )}
      {showActions && (
        <span className="flex gap-1 md:hidden md:group-hover:flex">
          {handRaised && (
            <button type="button" onClick={onLowerHand} className="rounded-md bg-room-hover px-2 py-1 text-xs hover:bg-[#444]">
              Lower Hand
            </button>
          )}
          {!participant.is_muted && (
            <button type="button" onClick={onMute} className="rounded-md bg-room-hover px-2 py-1 text-xs hover:bg-[#444]">
              Mute
            </button>
          )}
          {participant.role !== "host" && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md bg-room-hover px-2 py-1 text-xs text-red-400 hover:bg-[#444]"
            >
              Remove
            </button>
          )}
        </span>
      )}
      <span className={cn("flex items-center gap-2", showActions && "md:group-hover:hidden")}>
        {participant.is_muted ? (
          <MicOff className="h-4 w-4 text-zoom-red" aria-label="Muted" />
        ) : (
          <Mic className="h-4 w-4 text-room-muted" aria-label="Unmuted" />
        )}
        {participant.is_video_on ? (
          <Video className="h-4 w-4 text-room-muted" aria-label="Video on" />
        ) : (
          <VideoOff className="h-4 w-4 text-zoom-red" aria-label="Video off" />
        )}
      </span>
    </li>
  );
}
