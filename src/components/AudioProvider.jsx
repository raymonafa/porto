"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const AudioCtx = createContext(null);

const LS_MUTED  = "mm_audio_muted";
const LS_VOLUME = "mm_audio_volume";

export default function AudioProvider({
  src = "/audio/bg.mp3",
  initialVolume = 0.5,
  children,
}) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted]     = useState(false);
  const [volume, setVolume]   = useState(initialVolume);

  // Hydrate persisted state
  useEffect(() => {
    try {
      const m = localStorage.getItem(LS_MUTED);
      const v = localStorage.getItem(LS_VOLUME);
      if (m != null) setMuted(m === "1");
      if (v != null) setVolume(Math.max(0, Math.min(1, parseFloat(v))));
    } catch {}
  }, []);

  // Create single <audio>
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = new Audio();
    el.src = src;
    el.loop = true;
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    el.volume = volume;
    el.muted  = muted;
    audioRef.current = el;

    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    return () => {
      el.pause();
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      audioRef.current = null;
    };
  }, [src]); // recreate only if source changes

  // Persist + apply when volume/muted change
  useEffect(() => {
    try { localStorage.setItem(LS_VOLUME, String(volume)); } catch {}
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    try { localStorage.setItem(LS_MUTED, muted ? "1" : "0"); } catch {}
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  // Helper: try to play but NEVER change muted state
  const ensurePlayIfAllowed = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (muted) return;             // 🔒 respect user mute
    if (playing) return;
    try {
      await el.play();
    } catch {
      // Autoplay blocked; leave as-is
    }
  };

  // React to “overlay done” or route reveal → only start if NOT muted
  useEffect(() => {
    const onOverlayDone = () => { void ensurePlayIfAllowed(); };
    const onRouteReveal = () => { void ensurePlayIfAllowed(); };
    window.addEventListener("mm:overlay:done", onOverlayDone);
    window.addEventListener("app:transition:reveal:done", onRouteReveal);
    return () => {
      window.removeEventListener("mm:overlay:done", onOverlayDone);
      window.removeEventListener("app:transition:reveal:done", onRouteReveal);
    };
  }, [muted, playing]);

  const api = useMemo(() => ({
    // state
    playing, muted, volume,
    // controls
    async play()  { if (audioRef.current) { try { await audioRef.current.play(); } catch {} } },
    pause()       { if (audioRef.current) audioRef.current.pause(); },
    toggleMuted() { setMuted(m => !m); },
    setMuted,
    setVolume,
  }), [playing, muted, volume]);

  return <AudioCtx.Provider value={api}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
  return useContext(AudioCtx);
}
