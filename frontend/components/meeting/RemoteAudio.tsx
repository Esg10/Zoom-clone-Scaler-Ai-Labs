"use client";

import { useEffect, useRef } from "react";

type SinkableAudio = HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };

/** Plays one remote participant's audio, routed to the selected speaker if supported. */
export function RemoteAudio({ stream, outputDeviceId }: { stream: MediaStream; outputDeviceId: string }) {
  const ref = useRef<SinkableAudio>(null);

  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (outputDeviceId) void ref.current?.setSinkId?.(outputDeviceId).catch(() => undefined);
  }, [outputDeviceId]);

  return <audio ref={ref} autoPlay />;
}
