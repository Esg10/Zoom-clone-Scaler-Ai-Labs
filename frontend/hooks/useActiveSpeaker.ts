"use client";

import { useEffect, useRef, useState } from "react";

export interface AudioSource {
  id: number;
  track: MediaStreamTrack | null;
}

const SAMPLE_INTERVAL_MS = 200;
const SPEAKING_RMS_THRESHOLD = 0.02; // ~ -34 dBFS: above background noise, below normal speech
const HOLD_MS = 1200; // keep the highlight briefly through pauses between words

/**
 * Detects who is talking using the Web Audio API: each audio track feeds an
 * AnalyserNode, and every 200ms we compute its RMS volume and pick the loudest
 * source above the threshold.
 */
export function useActiveSpeaker(sources: AudioSource[]): number | null {
  const [activeId, setActiveId] = useState<number | null>(null);
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;
  // Rebuild the audio graph only when the set of tracks actually changes.
  const signature = sources.map((s) => `${s.id}:${s.track?.id ?? "-"}`).join("|");

  useEffect(() => {
    const live = sourcesRef.current.filter((s) => s.track && s.track.readyState === "live");
    if (!live.length || typeof AudioContext === "undefined") return;

    const context = new AudioContext();
    void context.resume().catch(() => undefined);
    const meters = live.map(({ id, track }) => {
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(new MediaStream([track!])).connect(analyser);
      return { id, analyser, samples: new Float32Array(analyser.fftSize) };
    });

    let current: number | null = null;
    let lastHeardAt = 0;
    const timer = setInterval(() => {
      let loudestId: number | null = null;
      let loudest = SPEAKING_RMS_THRESHOLD;
      for (const meter of meters) {
        meter.analyser.getFloatTimeDomainData(meter.samples);
        const rms = Math.sqrt(meter.samples.reduce((sum, s) => sum + s * s, 0) / meter.samples.length);
        if (rms > loudest) {
          loudest = rms;
          loudestId = meter.id;
        }
      }
      const now = Date.now();
      if (loudestId !== null) {
        lastHeardAt = now;
        if (loudestId !== current) setActiveId((current = loudestId));
      } else if (current !== null && now - lastHeardAt > HOLD_MS) {
        setActiveId((current = null));
      }
    }, SAMPLE_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      void context.close();
    };
  }, [signature]);

  return activeId;
}
