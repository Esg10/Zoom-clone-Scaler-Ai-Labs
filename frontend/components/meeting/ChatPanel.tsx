"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { formatTime } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { SidePanel } from "./SidePanel";

interface ChatPanelProps {
  messages: ChatMessage[];
  selfId: number;
  onSend: (content: string) => void;
  onClose: () => void;
}

export function ChatPanel({ messages, selfId, onSend, onClose }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = () => {
    const content = draft.trim();
    if (!content) return;
    onSend(content);
    setDraft("");
  };

  // Enter sends, Shift+Enter inserts a newline (Zoom behaviour).
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <SidePanel
      title="Meeting Chat"
      onClose={onClose}
      footer={
        <div className="rounded-lg border border-room-border bg-room-tile focus-within:border-zoom-blue">
          <p className="px-3 pt-2 text-xs text-room-muted">To: Everyone</p>
          <div className="flex items-end gap-2 p-2 pt-1">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              maxLength={2000}
              placeholder="Type message here..."
              aria-label="Chat message"
              className="min-h-0 flex-1 resize-none bg-transparent px-1 text-sm text-white outline-none placeholder:text-room-muted"
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim()}
              aria-label="Send message"
              className="rounded-md p-1.5 text-zoom-blue hover:bg-room-hover disabled:text-room-muted"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      }
    >
      {messages.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-room-muted">
          Messages addressed to &quot;Everyone&quot; will appear here.
        </p>
      ) : (
        <ul className="space-y-3 px-4 py-3">
          {messages.map((message, index) => {
            const isSelf = message.participant_id === selfId;
            const continued = index > 0 && messages[index - 1].participant_id === message.participant_id;
            return (
              <li key={message.id}>
                {!continued && (
                  <p className="mb-0.5 text-xs text-room-muted">
                    From <span className="text-white">{isSelf ? "Me" : message.sender_name}</span> to Everyone
                    <span className="ml-2">{formatTime(message.sent_at)}</span>
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
              </li>
            );
          })}
        </ul>
      )}
      <div ref={endRef} />
    </SidePanel>
  );
}
