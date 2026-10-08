"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface DeviceLists {
  audioinput: MediaDeviceInfo[];
  videoinput: MediaDeviceInfo[];
  audiooutput: MediaDeviceInfo[];
}

type DeviceKind = keyof DeviceLists;

const EMPTY_DEVICES: DeviceLists = { audioinput: [], videoinput: [], audiooutput: [] };
const VIDEO_CONSTRAINTS: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 } };

function describeMediaError(err: unknown, what: string): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError") return `${what} permission was denied. Allow access in your browser settings.`;
  if (name === "NotFoundError" || name === "OverconstrainedError") return `No ${what.toLowerCase()} was found.`;
  if (name === "NotReadableError") return `Your ${what.toLowerCase()} is in use by another application.`;
  return `Couldn't start your ${what.toLowerCase()}.`;
}

async function getTrack(kind: "audio" | "video", deviceId?: string): Promise<MediaStreamTrack> {
  const constraints: MediaTrackConstraints = {
    ...(kind === "video" ? VIDEO_CONSTRAINTS : { echoCancellation: true, noiseSuppression: true }),
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  };
  const stream = await navigator.mediaDevices.getUserMedia({ [kind]: constraints });
  return stream.getTracks()[0];
}

/**
 * Owns the local camera, microphone and screen-share tracks.
 * Mute keeps the mic track but disables it (instant unmute); turning video off
 * stops the camera track entirely so the camera light switches off.
 */
export function useMediaDevices(initial: { audio: boolean; video: boolean }) {
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [screenTrack, setScreenTrack] = useState<MediaStreamTrack | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [devices, setDevices] = useState<DeviceLists>(EMPTY_DEVICES);
  const [selected, setSelected] = useState<Record<DeviceKind, string>>({ audioinput: "", videoinput: "", audiooutput: "" });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Latest tracks for cleanup and for callbacks that shouldn't re-subscribe.
  const tracksRef = useRef({ audioTrack, videoTrack, screenTrack });
  tracksRef.current = { audioTrack, videoTrack, screenTrack };

  const refreshDevices = useCallback(async () => {
    const list = await navigator.mediaDevices?.enumerateDevices().catch(() => []);
    const next: DeviceLists = { audioinput: [], videoinput: [], audiooutput: [] };
    for (const device of list ?? []) if (device.deviceId) next[device.kind].push(device);
    setDevices(next);
  }, []);

  // Acquire the initially requested devices once, with a single permission prompt.
  useEffect(() => {
    let cancelled = false;
    const wantAudio = initial.audio;
    const wantVideo = initial.video;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Your browser doesn't support camera and microphone access.");
      } else if (wantAudio || wantVideo) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: wantAudio ? { echoCancellation: true, noiseSuppression: true } : false,
            video: wantVideo ? VIDEO_CONSTRAINTS : false,
          });
          if (cancelled) return stream.getTracks().forEach((t) => t.stop());
          setAudioTrack(stream.getAudioTracks()[0] ?? null);
          setAudioEnabled(Boolean(stream.getAudioTracks()[0]));
          setVideoTrack(stream.getVideoTracks()[0] ?? null);
        } catch (err) {
          if (!cancelled) setError(describeMediaError(err, wantVideo ? "Camera" : "Microphone"));
        }
      }
      if (!cancelled) {
        setReady(true);
        void refreshDevices();
      }
    })();
    return () => {
      cancelled = true;
    };
    // Initial preferences are read once on mount by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop every track when the component using this hook unmounts.
  useEffect(
    () => () => {
      const { audioTrack: a, videoTrack: v, screenTrack: s } = tracksRef.current;
      [a, v, s].forEach((track) => track?.stop());
    },
    [],
  );

  useEffect(() => {
    navigator.mediaDevices?.addEventListener("devicechange", refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener("devicechange", refreshDevices);
  }, [refreshDevices]);

  const setMuted = useCallback(
    async (muted: boolean) => {
      setError(null);
      const current = tracksRef.current.audioTrack;
      if (current) {
        current.enabled = !muted;
        setAudioEnabled(!muted);
        return;
      }
      if (muted) return;
      try {
        // "Don't connect to audio" was chosen earlier: acquire the mic on first unmute.
        const track = await getTrack("audio", selected.audioinput || undefined);
        setAudioTrack(track);
        setAudioEnabled(true);
        void refreshDevices();
      } catch (err) {
        setError(describeMediaError(err, "Microphone"));
      }
    },
    [selected.audioinput, refreshDevices],
  );

  const setVideoOn = useCallback(
    async (on: boolean) => {
      setError(null);
      const current = tracksRef.current.videoTrack;
      if (!on) {
        current?.stop();
        setVideoTrack(null);
        return;
      }
      if (current) return;
      try {
        setVideoTrack(await getTrack("video", selected.videoinput || undefined));
        void refreshDevices();
      } catch (err) {
        setError(describeMediaError(err, "Camera"));
      }
    },
    [selected.videoinput, refreshDevices],
  );

  const selectDevice = useCallback(async (kind: DeviceKind, deviceId: string) => {
    setSelected((current) => ({ ...current, [kind]: deviceId }));
    if (kind === "audiooutput") return; // applied by the audio elements via setSinkId
    const { audioTrack: oldAudio, videoTrack: oldVideo } = tracksRef.current;
    try {
      if (kind === "audioinput" && oldAudio) {
        const track = await getTrack("audio", deviceId);
        track.enabled = oldAudio.enabled;
        oldAudio.stop();
        setAudioTrack(track);
      } else if (kind === "videoinput" && oldVideo) {
        const track = await getTrack("video", deviceId);
        oldVideo.stop();
        setVideoTrack(track);
      }
    } catch (err) {
      setError(describeMediaError(err, kind === "audioinput" ? "Microphone" : "Camera"));
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    tracksRef.current.screenTrack?.stop();
    setScreenTrack(null);
  }, []);

  const startScreenShare = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen sharing isn't supported in this browser.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      track.onended = () => setScreenTrack(null); // user clicked the browser's "Stop sharing"
      setScreenTrack(track);
      return true;
    } catch {
      return false; // user cancelled the picker
    }
  }, []);

  /** Release camera, mic and screen (when leaving the meeting). */
  const stopAll = useCallback(() => {
    const { audioTrack: a, videoTrack: v, screenTrack: s } = tracksRef.current;
    [a, v, s].forEach((track) => track?.stop());
    setAudioTrack(null);
    setVideoTrack(null);
    setScreenTrack(null);
  }, []);

  /** What the local tile shows: the screen while sharing, otherwise the camera. */
  const previewStream = useMemo(() => {
    const track = screenTrack ?? videoTrack;
    return track ? new MediaStream([track]) : null;
  }, [screenTrack, videoTrack]);

  return {
    ready,
    error,
    audioTrack,
    videoTrack,
    screenTrack,
    previewStream,
    audioEnabled: audioEnabled && Boolean(audioTrack),
    videoEnabled: Boolean(videoTrack),
    devices,
    selected,
    setMuted,
    setVideoOn,
    selectDevice,
    startScreenShare,
    stopScreenShare,
    stopAll,
    clearError: () => setError(null),
  };
}

export type MediaControls = ReturnType<typeof useMediaDevices>;
