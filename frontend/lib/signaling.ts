// Thin typed wrapper around the meeting WebSocket with per-message-type listeners.
import type { ClientMessage, ServerMessage, ServerMessageOf, ServerMessageType } from "@/types/realtime";

type Listener<T extends ServerMessageType> = (message: ServerMessageOf<T>) => void;

export class MeetingSocket {
  private ws: WebSocket | null = null;
  private listeners = new Map<ServerMessageType, Set<(message: ServerMessage) => void>>();
  private closeListeners = new Set<(event: CloseEvent) => void>();
  private outbox: ClientMessage[] = [];

  constructor(private readonly url: string) {}

  /**
   * Opens the connection. Kept separate from the constructor so every hook can
   * subscribe first; otherwise the server's immediate "welcome" could be missed.
   */
  connect(): void {
    if (this.ws) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      for (const message of this.outbox.splice(0)) ws.send(JSON.stringify(message));
    };
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      this.listeners.get(message.type)?.forEach((listener) => listener(message));
    };
    ws.onclose = (event) => this.closeListeners.forEach((listener) => listener(event));
  }

  /** Subscribe to one message type; returns an unsubscribe function. */
  on<T extends ServerMessageType>(type: T, listener: Listener<T>): () => void {
    const set = this.listeners.get(type) ?? new Set();
    const wrapped = listener as (message: ServerMessage) => void;
    set.add(wrapped);
    this.listeners.set(type, set);
    return () => set.delete(wrapped);
  }

  onClose(listener: (event: CloseEvent) => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  /** Sends now if open, otherwise queues until the connection opens. */
  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
    else if (!this.ws || this.ws.readyState === WebSocket.CONNECTING) this.outbox.push(message);
  }

  close(): void {
    this.closeListeners.clear();
    this.listeners.clear();
    this.ws?.close();
  }
}
