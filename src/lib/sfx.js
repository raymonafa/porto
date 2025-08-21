"use client";

import { useRef, useCallback } from "react";
import { useAudio } from "@/components/AudioProvider";

/**
 * Pakai:
 *   const playHover = useSfx("/sfx/hover.mp3", { volume: 0.45, rate: [0.98, 1.05], throttleMs: 120 });
 *   const playClick = useSfx("/sfx/click.mp3", { volume: 0.6 });
 *
 * Behavior:
 * - Kalau AudioProvider.muted === true → SFX tidak dimainkan.
 * - Volume SFX dikalikan master volume dari AudioProvider (audio.volume).
 * - throttleMs mencegah spam SFX.
 */
export function useSfx(src, opts = {}) {
  const audio = useAudio();
  const lastRef = useRef(0);

  const {
    volume = 1,
    rate = 1,            // number atau [min, max]
    throttleMs = 0,
  } = opts;

  const pickRate = () => {
    if (Array.isArray(rate)) {
      const [min, max] = rate;
      return min + Math.random() * (max - min);
    }
    return rate;
  };

  return useCallback(() => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (throttleMs && now - lastRef.current < throttleMs) return;
    lastRef.current = now;

    if (typeof window === "undefined") return;

    // Hormati toggle global: jika muted → jangan mainkan SFX
    if (audio?.muted) return;

    const el = new Audio();
    el.src = src;
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    // master volume dari provider (audio.volume) * volume per-SFX
    el.volume = Math.max(0, Math.min(1, (audio?.volume ?? 1) * volume));
    el.playbackRate = pickRate();

    const cleanup = () => {
      try { el.pause(); } catch {}
      el.src = ""; // release resource
    };
    el.addEventListener("ended", cleanup, { once: true });
    el.addEventListener("error", cleanup, { once: true });

    el.play().catch(() => cleanup());
  }, [src, volume, rate, throttleMs, audio?.muted, audio?.volume]);
}
