import { Circle, Keyboard, MonitorUp, UserPlus } from "lucide-react";
import { MenuItem } from "@/components/ui/Popover";
import type { Reaction } from "@/types/realtime";
import { ReactionsPicker } from "./ReactionsPicker";

interface MoreMenuProps {
  close: () => void;
  isSharing: boolean;
  onInvite: () => void;
  onToggleShare: () => void;
  onRecord: () => void;
  onReaction: (emoji: Reaction) => void;
}

/** Overflow menu; on small screens it also holds the toolbar items that are hidden. */
export function MoreMenu({ close, isSharing, onInvite, onToggleShare, onRecord, onReaction }: MoreMenuProps) {
  const run = (action: () => void) => () => {
    close();
    action();
  };
  return (
    <>
      <MenuItem tone="dark" icon={<UserPlus className="h-4 w-4" />} onSelect={run(onInvite)}>
        Invite
      </MenuItem>
      <div className="md:hidden">
        <MenuItem tone="dark" icon={<MonitorUp className="h-4 w-4 text-green-400" />} onSelect={run(onToggleShare)}>
          {isSharing ? "Stop Share" : "Share Screen"}
        </MenuItem>
        <MenuItem tone="dark" icon={<Circle className="h-4 w-4" />} onSelect={run(onRecord)}>
          Record
        </MenuItem>
        <p className="px-3 pt-2 text-xs font-semibold text-room-muted">Reactions</p>
        <ReactionsPicker onPick={(emoji) => run(() => onReaction(emoji))()} />
      </div>
      <div className="mt-1 flex items-start gap-2.5 border-t border-room-border px-3 pb-1 pt-2 text-xs text-room-muted">
        <Keyboard className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          <kbd className="font-sans text-white">Alt+A</kbd> mute / unmute · <kbd className="font-sans text-white">Alt+V</kbd> start / stop video
        </span>
      </div>
    </>
  );
}
