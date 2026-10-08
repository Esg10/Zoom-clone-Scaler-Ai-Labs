// Mesh WebRTC: one RTCPeerConnection per remote participant.
//
// Negotiation rule (avoids "glare", where both sides offer at once):
//   the participant who JOINS sends offers to everyone already in the room;
//   existing participants only ever answer.
//
// Each connection always carries exactly two transceivers, audio then video.
// Turning the camera/mic on or off, switching devices, or screen sharing just
// swaps the outgoing track with `replaceTrack`, so no renegotiation is needed.
import type { SignalData } from "@/types/realtime";

const ICE_SERVERS: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

type Kind = "audio" | "video";

interface Peer {
  pc: RTCPeerConnection;
  stream: MediaStream; // remote tracks received from this peer
  pendingCandidates: RTCIceCandidateInit[];
}

export interface PeerManagerOptions {
  sendSignal: (to: number, data: SignalData) => void;
  onRemoteStream: (peerId: number, stream: MediaStream) => void;
  onPeerClosed: (peerId: number) => void;
}

export class PeerManager {
  private peers = new Map<number, Peer>();
  private tracks: Record<Kind, MediaStreamTrack | null> = { audio: null, video: null };

  constructor(private readonly options: PeerManagerOptions) {}

  /** Newcomer side: open a connection to an existing participant and send an offer. */
  async connect(peerId: number): Promise<void> {
    const peer = this.createPeer(peerId);
    // Fixed order (audio, video) so both ends map m-lines to the same kinds.
    peer.pc.addTransceiver(this.tracks.audio ?? "audio", { direction: "sendrecv" });
    peer.pc.addTransceiver(this.tracks.video ?? "video", { direction: "sendrecv" });
    await peer.pc.setLocalDescription(await peer.pc.createOffer());
    this.sendDescription(peerId, peer.pc);
  }

  /** Handle an offer/answer/ICE candidate relayed from `from` by the server. */
  async handleSignal(from: number, data: SignalData): Promise<void> {
    if (data.kind === "candidate") return this.addCandidate(from, data.candidate);

    const { description } = data;
    if (description.type === "offer") {
      // A fresh offer always starts a fresh connection (e.g. the peer reconnected).
      this.close(from);
      const peer = this.createPeer(from);
      await peer.pc.setRemoteDescription(description);
      await this.flushCandidates(peer);
      // The offer created our transceivers; attach our current tracks to them.
      for (const transceiver of peer.pc.getTransceivers()) {
        transceiver.direction = "sendrecv";
        await transceiver.sender.replaceTrack(this.tracks[transceiver.receiver.track.kind as Kind]);
      }
      await peer.pc.setLocalDescription(await peer.pc.createAnswer());
      this.sendDescription(from, peer.pc);
    } else {
      const peer = this.peers.get(from);
      if (!peer) return;
      await peer.pc.setRemoteDescription(description);
      await this.flushCandidates(peer);
    }
  }

  /** Swap the outgoing audio or video track on every connection (null = send nothing). */
  async setTrack(kind: Kind, track: MediaStreamTrack | null): Promise<void> {
    this.tracks[kind] = track;
    await Promise.all(
      Array.from(this.peers.values()).map((peer) => {
        const transceiver = peer.pc.getTransceivers().find((t) => t.receiver.track.kind === kind);
        return transceiver?.sender.replaceTrack(track).catch(() => undefined);
      }),
    );
  }

  close(peerId: number): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.pc.ontrack = null;
    peer.pc.onicecandidate = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    this.peers.delete(peerId);
    this.options.onPeerClosed(peerId);
  }

  closeAll(): void {
    for (const peerId of Array.from(this.peers.keys())) this.close(peerId);
  }

  private createPeer(peerId: number): Peer {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peer: Peer = { pc, stream: new MediaStream(), pendingCandidates: [] };
    this.peers.set(peerId, peer);

    pc.onicecandidate = (event) => {
      if (event.candidate) this.options.sendSignal(peerId, { kind: "candidate", candidate: event.candidate.toJSON() });
    };
    pc.ontrack = (event) => {
      peer.stream.addTrack(event.track);
      // New MediaStream object so React notices the change and re-binds <video>.
      this.options.onRemoteStream(peerId, new MediaStream(peer.stream.getTracks()));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") pc.restartIce();
    };
    return peer;
  }

  private sendDescription(peerId: number, pc: RTCPeerConnection): void {
    if (pc.localDescription) {
      this.options.sendSignal(peerId, { kind: "description", description: pc.localDescription.toJSON() });
    }
  }

  // ICE candidates can arrive before the remote description is set; queue them until it is.
  private async addCandidate(from: number, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(from);
    if (!peer) return;
    if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(candidate).catch(() => undefined);
    else peer.pendingCandidates.push(candidate);
  }

  private async flushCandidates(peer: Peer): Promise<void> {
    const queued = peer.pendingCandidates.splice(0);
    for (const candidate of queued) await peer.pc.addIceCandidate(candidate).catch(() => undefined);
  }
}
