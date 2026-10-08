"use client";

import { useState } from "react";
import { Circle, Mic, MicOff, MonitorUp, MoreHorizontal, ShieldCheck, SmilePlus, Users, Video, VideoOff, MessageSquare } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import type { MediaControls } from "@/hooks/useMediaDevices";
import type { Meeting } from "@/types";
import type { Reaction } from "@/types/realtime";
import { ControlButton } from "./ControlButton";
import { DeviceMenu } from "./DeviceMenu";
import { EndMeetingMenu } from "./EndMeetingMenu";
import { MoreMenu } from "./MoreMenu";
import { ReactionsPicker } from "./ReactionsPicker";
import { SecurityMenu } from "./SecurityMenu";

export type PanelKind = "participants" | "chat" | null;

interface ControlBarProps {
  meeting: Meeting;
  media: MediaControls;
  isHost: boolean;
  participantCount: number;
  unreadCount: number;
  panel: PanelKind;
  onTogglePanel: (panel: Exclude<PanelKind, null>) => void;
  onToggleShare: () => void;
  onRecord: () => void;
  onReaction: (emoji: Reaction) => void;
  onInvite: () => void;
  onLeave: () => void;
  onEndForAll: () => Promise<void>;
}

const ICON = "h-6 w-6";

/** Bottom toolbar in Zoom's order: audio/video | meeting tools | End. */
export function ControlBar(props: ControlBarProps) {
  const { meeting, media, isHost, participantCount, unreadCount, panel, onTogglePanel } = props;
  const [popover, setPopover] = useState<"security" | "reactions" | "more" | null>(null);
  const toggle = (name: typeof popover) => setPopover(popover === name ? null : name);
  const isSharing = Boolean(media.screenTrack);

  // A popover-backed toolbar button (Security, Reactions, More).
  const popoverButton = (name: Exclude<typeof popover, null>, button: React.ReactNode, content: React.ReactNode, className = "") => (
    <div className={className}>
      <Popover open={popover === name} onOpenChange={(open) => setPopover(open ? name : null)} side="top" align="center" tone="dark" trigger={button}>
        {content}
      </Popover>
    </div>
  );

  return (
    <footer className="flex h-[68px] shrink-0 items-center justify-between gap-1 bg-room-bg px-2 sm:px-4">
      <div className="flex items-center">
        <ControlButton
          icon={media.audioEnabled ? <Mic className={ICON} /> : <MicOff className={`${ICON} text-zoom-red`} />}
          label={media.audioEnabled ? "Mute" : "Unmute"}
          shortcut="Alt+A"
          onClick={() => void media.setMuted(media.audioEnabled)}
          menu={() => (
            <DeviceMenu
              sections={[{ title: "Select a Microphone", kind: "audioinput" }, { title: "Select a Speaker", kind: "audiooutput" }]}
              devices={media.devices}
              selected={media.selected}
              onSelect={media.selectDevice}
            />
          )}
        />
        <ControlButton
          icon={media.videoEnabled ? <Video className={ICON} /> : <VideoOff className={`${ICON} text-zoom-red`} />}
          label={media.videoEnabled ? "Stop Video" : "Start Video"}
          shortcut="Alt+V"
          onClick={() => void media.setVideoOn(!media.videoEnabled)}
          menu={() => (
            <DeviceMenu sections={[{ title: "Select a Camera", kind: "videoinput" }]} devices={media.devices} selected={media.selected} onSelect={media.selectDevice} />
          )}
        />
      </div>

      <div className="flex items-center">
        {popoverButton(
          "security",
          <ControlButton icon={<ShieldCheck className={ICON} />} label="Security" onClick={() => toggle("security")} />,
          <SecurityMenu meeting={meeting} />,
          "hidden md:block",
        )}
        <ControlButton
          icon={<Users className={ICON} />}
          label="Participants"
          badge={participantCount}
          badgeTone="count"
          active={panel === "participants"}
          onClick={() => onTogglePanel("participants")}
        />
        <ControlButton icon={<MessageSquare className={ICON} />} label="Chat" badge={unreadCount} active={panel === "chat"} onClick={() => onTogglePanel("chat")} />
        <ControlButton
          className="hidden md:flex"
          icon={
            <span className={`flex h-6 w-6 items-center justify-center rounded-md ${isSharing ? "bg-zoom-red" : "bg-[#0E9F4E]"}`}>
              <MonitorUp className="h-4 w-4 text-white" />
            </span>
          }
          label={isSharing ? "Stop Share" : "Share Screen"}
          onClick={props.onToggleShare}
        />
        <ControlButton className="hidden md:flex" icon={<Circle className={ICON} />} label="Record" onClick={props.onRecord} />
        {popoverButton(
          "reactions",
          <ControlButton icon={<SmilePlus className={ICON} />} label="Reactions" onClick={() => toggle("reactions")} />,
          <ReactionsPicker onPick={(emoji) => { setPopover(null); props.onReaction(emoji); }} />,
          "hidden md:block",
        )}
        {popoverButton(
          "more",
          <ControlButton icon={<MoreHorizontal className={ICON} />} label="More" onClick={() => toggle("more")} />,
          <MoreMenu
            close={() => setPopover(null)}
            isSharing={isSharing}
            onInvite={props.onInvite}
            onToggleShare={props.onToggleShare}
            onRecord={props.onRecord}
            onReaction={props.onReaction}
          />,
        )}
      </div>

      <EndMeetingMenu isHost={isHost} onLeave={props.onLeave} onEndForAll={props.onEndForAll} />
    </footer>
  );
}
