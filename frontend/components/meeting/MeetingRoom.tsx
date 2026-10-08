"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useActiveSpeaker } from "@/hooks/useActiveSpeaker";
import { useHostActions } from "@/hooks/useHostActions";
import { useAltShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { MediaControls } from "@/hooks/useMediaDevices";
import { useMeeting, useMeetingSocket, type RoomStatus } from "@/hooks/useMeeting";
import { useRoomMediaSync } from "@/hooks/useRoomMediaSync";
import { useWebRTC } from "@/hooks/useWebRTC";
import type { Meeting, Participant } from "@/types";
import { ChatPanel } from "./ChatPanel";
import { ControlBar, type PanelKind } from "./ControlBar";
import { InviteModal } from "./InviteModal";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { RemoteAudio } from "./RemoteAudio";
import { SharePrompt } from "./SharePrompt";
import { SpeakerView } from "./SpeakerView";
import { buildTiles } from "./tiles";
import { TopBar, type ViewMode } from "./TopBar";
import { VideoGrid } from "./VideoGrid";
import { WaitingRoomNotice } from "./WaitingRoomNotice";
import { WaitingRoomScreen } from "./WaitingRoomScreen";

export type ExitReason = Extract<RoomStatus, "removed" | "ended" | "disconnected" | "rejected"> | "left";

interface MeetingRoomProps {
  meeting: Meeting;
  self: Participant;
  /** Secret from the join response; authenticates our socket and host actions. */
  participantToken: string;
  media: MediaControls;
  showInviteOnStart: boolean;
  promptShare: boolean;
  onExit: (reason: ExitReason, message?: string | null) => void;
}

export function MeetingRoom({
  meeting,
  self,
  participantToken,
  media,
  showInviteOnStart,
  promptShare,
  onExit,
}: MeetingRoomProps) {
  const toast = useToast();
  const socket = useMeetingSocket(meeting.meeting_code, self.id, participantToken);
  const room = useMeeting(socket);
  const remoteStreams = useWebRTC(socket, media.audioTrack, media.screenTrack ?? media.videoTrack);
  // Open the socket only after every hook above has subscribed to its messages.
  useEffect(() => socket?.connect(), [socket]);
  useRoomMediaSync(socket, media, self.id);
  const host = useHostActions(meeting.meeting_code, self.id, participantToken);

  const [view, setView] = useState<ViewMode>("gallery");
  const [panel, setPanel] = useState<PanelKind>(null);
  const [inviteOpen, setInviteOpen] = useState(showInviteOnStart);
  const [seenMessages, setSeenMessages] = useState(0);
  const [lastSpeakerId, setLastSpeakerId] = useState<number | null>(null);

  const me = room.participants.find((p) => p.id === self.id) ?? self;
  const isHost = me.role === "host" || me.role === "co_host";

  useEffect(() => {
    if (room.status !== "connecting" && room.status !== "waiting" && room.status !== "connected")
      onExit(room.status, room.statusMessage);
  }, [room.status, room.statusMessage, onExit]);

  const tiles = buildTiles({ self: me, participants: room.participants, remoteStreams, media, reactions: room.reactions });

  const activeSpeakerId = useActiveSpeaker(
    tiles.map((tile) => ({
      id: tile.id,
      track: tile.isSelf ? media.audioTrack : (remoteStreams[tile.id]?.getAudioTracks()[0] ?? null),
    })),
  );
  useEffect(() => {
    if (activeSpeakerId !== null && activeSpeakerId !== self.id) setLastSpeakerId(activeSpeakerId);
  }, [activeSpeakerId, self.id]);

  // Unread chat = messages from others that arrived while the chat panel was closed.
  useEffect(() => {
    setSeenMessages((seen) => (panel === "chat" ? room.messages.length : Math.max(seen, room.historyCount)));
  }, [panel, room.messages.length, room.historyCount]);
  const unread = panel === "chat" ? 0 : room.messages.slice(seenMessages).filter((m) => m.participant_id !== self.id).length;

  useAltShortcuts({
    KeyA: () => void media.setMuted(media.audioEnabled),
    KeyV: () => void media.setVideoOn(!media.videoEnabled),
  });

  const toggleShare = async () => {
    if (media.screenTrack) return media.stopScreenShare();
    if (room.sharerId !== null && room.sharerId !== self.id) toast("Your share will replace the current one");
    await media.startScreenShare();
  };

  // A screen share always takes the main stage, like Zoom's share view.
  const focusId =
    room.sharerId ?? (media.screenTrack ? self.id : null) ?? lastSpeakerId ?? tiles.find((t) => !t.isSelf)?.id ?? self.id;
  const useSpeakerLayout = view === "speaker" || room.sharerId !== null || Boolean(media.screenTrack);

  if (room.status === "waiting") return <WaitingRoomScreen meeting={meeting} onLeave={() => onExit("left")} />;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-room-bg text-white">
      <TopBar meeting={meeting} view={view} onViewChange={setView} />

      <div className="flex min-h-0 flex-1 gap-2 px-2">
        <main className="relative min-w-0 flex-1" aria-label="Participants video">
          {useSpeakerLayout ? (
            <SpeakerView tiles={tiles} focusId={focusId} activeSpeakerId={activeSpeakerId} />
          ) : (
            <VideoGrid tiles={tiles} activeSpeakerId={activeSpeakerId} />
          )}
          {room.status === "connecting" && (
            <p className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs">Connecting…</p>
          )}
          {promptShare && !media.screenTrack && <SharePrompt onShare={toggleShare} />}
          {isHost && panel !== "participants" && (
            <WaitingRoomNotice waiting={room.waiting} onAdmit={host.admit} onOpenPanel={() => setPanel("participants")} />
          )}
        </main>

        {panel === "participants" && (
          <ParticipantsPanel
            participants={room.participants.length ? room.participants : [{ ...me, is_sharing: false }]}
            waiting={room.waiting}
            selfId={self.id}
            canModerate={isHost}
            onClose={() => setPanel(null)}
            onInvite={() => setInviteOpen(true)}
            onMuteAll={host.muteAll}
            onMute={host.mute}
            onAdmit={host.admit}
            onRemove={host.remove}
          />
        )}
        {panel === "chat" && (
          <ChatPanel
            messages={room.messages}
            selfId={self.id}
            onSend={(content) => room.send({ type: "chat", content })}
            onClose={() => setPanel(null)}
          />
        )}
      </div>

      <ControlBar
        meeting={meeting}
        media={media}
        isHost={isHost}
        participantCount={Math.max(room.participants.length, 1)}
        unreadCount={unread}
        panel={panel}
        onTogglePanel={(next) => setPanel(panel === next ? null : next)}
        onToggleShare={toggleShare}
        onRecord={() => toast("Recording isn't available in this demo")}
        onReaction={(emoji) => room.send({ type: "reaction", emoji })}
        onInvite={() => setInviteOpen(true)}
        onLeave={() => onExit("left")}
        onEndForAll={host.endForAll}
      />

      {Object.entries(remoteStreams).map(([id, stream]) => (
        <RemoteAudio key={id} stream={stream} outputDeviceId={media.selected.audiooutput} />
      ))}
      {media.error && (
        <p
          role="alert"
          className="absolute left-1/2 top-12 z-30 -translate-x-1/2 rounded-lg bg-amber-500/90 px-3 py-1.5 text-xs text-black"
        >
          {media.error}
          <button type="button" className="ml-3 underline" onClick={media.clearError}>
            Dismiss
          </button>
        </p>
      )}
      <InviteModal meeting={meeting} open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
