import { REACTIONS, type Reaction } from "@/types/realtime";

export function ReactionsPicker({ onPick }: { onPick: (emoji: Reaction) => void }) {
  return (
    <div className="flex gap-1 p-1">
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
  );
}
