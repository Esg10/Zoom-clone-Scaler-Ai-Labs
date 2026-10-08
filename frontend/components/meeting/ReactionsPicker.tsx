import { REACTIONS, type Reaction } from "@/types/realtime";

interface ReactionsPickerProps {
  onPick: (emoji: Reaction) => void;
  handRaised: boolean;
  onToggleHand: () => void;
}

/** Zoom's Reactions menu: a row of emoji, then Raise Hand / Lower Hand underneath. */
export function ReactionsPicker({ onPick, handRaised, onToggleHand }: ReactionsPickerProps) {
  return (
    <div className="flex flex-col gap-1 p-1">
      <div className="flex gap-1">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`React with ${emoji}`}
            onClick={() => onPick(emoji)}
            className="rounded-lg p-1.5 text-2xl transition-transform hover:scale-110 hover:bg-white/10"
          >
            {emoji}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onToggleHand}
        title={`${handRaised ? "Lower" : "Raise"} Hand (Alt+Y)`}
        className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20"
      >
        <span aria-hidden className="text-lg">
          ✋
        </span>
        {handRaised ? "Lower Hand" : "Raise Hand"}
      </button>
    </div>
  );
}
