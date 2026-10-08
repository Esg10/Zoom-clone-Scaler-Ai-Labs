"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Participant, RoomParticipant } from "@/types";
import { ParticipantRow } from "./ParticipantRow";
import { SidePanel } from "./SidePanel";
import { WaitingRoomList } from "./WaitingRoomList";

interface ParticipantsPanelProps {
  participants: RoomParticipant[];
  waiting: Participant[];
  selfId: number;
  canModerate: boolean;
  onClose: () => void;
  onInvite: () => void;
  onMuteAll: () => void;
  onMute: (id: number) => void;
  onLowerHand: (id: number) => void;
  onLowerAllHands: () => void;
  onAdmit: (id: number) => void;
  onRemove: (id: number) => Promise<void>;
}

const ROLE_ORDER = { host: 0, co_host: 1, attendee: 2 };
const raisedOrder = (p: RoomParticipant) => (p.hand_raised_at ? new Date(p.hand_raised_at).getTime() : Infinity);

export function ParticipantsPanel(props: ParticipantsPanelProps) {
  const { participants, selfId, canModerate } = props;
  const [pendingRemoval, setPendingRemoval] = useState<RoomParticipant | null>(null);

  // Like Zoom: raised hands first, in the order they were raised; then me,
  // host/co-hosts, and everyone else in join order.
  const sorted = useMemo(
    () =>
      [...participants].sort(
        (a, b) =>
          raisedOrder(a) - raisedOrder(b) ||
          Number(b.id === selfId) - Number(a.id === selfId) ||
          ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
          a.id - b.id,
      ),
    [participants, selfId],
  );
  const anyHandRaised = participants.some((p) => p.hand_raised_at);

  return (
    <SidePanel
      title={`Participants (${participants.length})`}
      onClose={props.onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="dark" size="sm" className="flex-1" onClick={props.onInvite}>
            Invite
          </Button>
          {canModerate && (
            <Button variant="dark" size="sm" className="flex-1" onClick={props.onMuteAll}>
              Mute All
            </Button>
          )}
          {canModerate && anyHandRaised && (
            <Button variant="dark" size="sm" className="w-full" onClick={props.onLowerAllHands}>
              Lower All Hands
            </Button>
          )}
        </div>
      }
    >
      {canModerate && (
        <WaitingRoomList waiting={props.waiting} onAdmit={props.onAdmit} onRemove={(id) => void props.onRemove(id)} />
      )}
      <ul className="py-2">
        {sorted.map((participant) => (
          <ParticipantRow
            key={participant.id}
            participant={participant}
            isSelf={participant.id === selfId}
            canModerate={canModerate}
            onMute={() => props.onMute(participant.id)}
            onLowerHand={() => props.onLowerHand(participant.id)}
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
