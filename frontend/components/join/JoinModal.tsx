"use client";

import { Modal } from "@/components/ui/Modal";
import { JoinForm } from "./JoinForm";

interface JoinModalProps {
  open: boolean;
  onClose: () => void;
  shareScreen?: boolean;
}

export function JoinModal({ open, onClose, shareScreen = false }: JoinModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={shareScreen ? "Share screen in a meeting" : "Join meeting"}>
      {shareScreen && (
        <p className="mb-4 rounded-lg bg-zoom-blue-light px-3 py-2 text-sm text-zoom-blue">
          Enter the meeting you want to share your screen in. You&apos;ll be prompted to share once you&apos;re in.
        </p>
      )}
      <JoinForm shareScreen={shareScreen} onCancel={onClose} />
    </Modal>
  );
}
