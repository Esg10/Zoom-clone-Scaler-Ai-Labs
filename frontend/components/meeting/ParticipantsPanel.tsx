"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { RoomParticipant } from "@/types";
import { ParticipantRow } from "./ParticipantRow";
import { SidePanel } from "./SidePanel";

interface ParticipantsPanelProps {
  participants: RoomParticipant[];
  selfId: number;
  canModerate: boolean;
  onClose: () => void;
  onInvite: () => void;
  onMuteAll: () => void;
  onMute: (id: number) => void;
  onRemove: (id: number) => Promise<void>;
}

const ROLE_ORDER = { host: 0, co_host: 1, attendee: 2 };

export function ParticipantsPanel(props: ParticipantsPanelProps) {
  const { participants, selfId, canModerate } = props;
  const [pendingRemoval, setPendingRemoval] = useState<RoomParticipant | null>(null);

  // Me first, then host/co-hosts, then everyone else in join order.
  const sorted = useMemo(
    () =>
      [...participants].sort(
        (a, b) => Number(b.id === selfId) - Number(a.id === selfId) || ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.id - b.id,
      ),
    [participants, selfId],
  );

  return (
    <SidePanel
      title={`Participants (${participants.length})`}
      onClose={props.onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="dark" size="sm" className="flex-1" onClick={props.onInvite}>
            Invite
          </Button>
          {canModerate && (
            <Button variant="dark" size="sm" className="flex-1" onClick={props.onMuteAll}>
              Mute All
            </Button>
          )}
        </div>
      }
    >
      <ul className="py-2">
        {sorted.map((participant) => (
          <ParticipantRow
            key={participant.id}
            participant={participant}
            isSelf={participant.id === selfId}
            canModerate={canModerate}
            onMute={() => props.onMute(participant.id)}
            onRemove={() => setPendingRemoval(participant)}
          />
        ))}
      </ul>
      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Remove participant?"
        message={`Do you want to remove ${pendingRemoval?.display_name} from the meeting?`}
        confirmLabel="Remove"
        onClose={() => setPendingRemoval(null)}
        onConfirm={async () => {
          if (pendingRemoval) await props.onRemove(pendingRemoval.id);
        }}
      />
    </SidePanel>
  );
}
