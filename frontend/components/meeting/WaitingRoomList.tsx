import { Avatar } from "@/components/ui/Avatar";
import type { Participant } from "@/types";

interface WaitingRoomListProps {
  waiting: Participant[];
  onAdmit: (id: number) => void;
  onRemove: (id: number) => void;
}

/** Host-only section at the top of the Participants panel. */
export function WaitingRoomList({ waiting, onAdmit, onRemove }: WaitingRoomListProps) {
  if (!waiting.length) return null;
  return (
    <section className="border-b border-room-border py-2">
      <h3 className="px-4 pb-1 text-xs font-semibold text-room-muted">Waiting Room ({waiting.length})</h3>
      <ul>
        {waiting.map((person) => (
          <li key={person.id} className="flex items-center gap-3 px-4 py-2">
            <Avatar name={person.display_name} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm">{person.display_name}</span>
            <button
              type="button"
              onClick={() => onAdmit(person.id)}
              className="rounded-md bg-zoom-blue px-2 py-1 text-xs font-medium hover:bg-zoom-blue-hover"
            >
              Admit
            </button>
            <button
              type="button"
              onClick={() => onRemove(person.id)}
              className="rounded-md bg-room-hover px-2 py-1 text-xs text-red-400 hover:bg-[#444]"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
