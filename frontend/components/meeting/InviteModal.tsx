"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { copyText, formatMeetingId, invitationText } from "@/lib/utils";
import type { Meeting } from "@/types";

export function InviteModal({ meeting, open, onClose }: { meeting: Meeting; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const copy = async (value: string, what: string) => {
    const ok = await copyText(value);
    toast(ok ? `${what} copied` : "Couldn't access the clipboard", ok ? "success" : "error");
  };

  const rows = [
    { label: "Meeting ID", value: formatMeetingId(meeting.meeting_code), raw: meeting.meeting_code },
    { label: "Passcode", value: meeting.passcode, raw: meeting.passcode },
    { label: "Invite link", value: meeting.invite_link, raw: meeting.invite_link },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Invite people to join ${meeting.title}`}
      footer={
        <>
          <Button variant="secondary" onClick={() => copy(invitationText(meeting), "Invitation")}>
            <Copy className="h-4 w-4" /> Copy Invitation
          </Button>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      <dl className="space-y-3">
        {rows.map(({ label, value, raw }) => (
          <div key={label} className="flex items-center gap-3 rounded-lg bg-zoom-bg px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <dt className="text-xs text-zoom-muted">{label}</dt>
              <dd className="truncate text-sm font-medium">{value}</dd>
            </div>
            <Button variant="ghost" size="sm" onClick={() => copy(raw, label)} aria-label={`Copy ${label}`}>
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
