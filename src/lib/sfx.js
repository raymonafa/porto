"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAudio } from "@/components/AudioProvider";

// Ambil bus global yg diexpose oleh AudioProvider
function getGlobalBus() {
  if (typeof window === "undefined") return null;
  const bus = window.__mmAudioBus;
  return bus && bus.ctx && bus.busGain ? bus : null;
}

/**
 * Pakai:
 *   const hover = useSfx("/sfx/hover.mp3", { volume: 0.45, rate: [0.98, 1.05], throttleMs: 120 });
 *   const click = useSfx("/sfx/click.mp3", { volume: 0.6 });
 *
 * Efek:
 * - Route ke bus global → ikut FADE saat mute/unmute.
 * - Hormati audio.volume dari AudioProvider.
 * - throttle mencegah spam.
 */
export function useSfx(src, opts = {}) {
  const audio = useAudio();
  const lastRef = useRef(0);

  const {
    volume = 1,
    rate = 1,           // number atau [min, max]
    throttleMs = 0,
    attackMs = 3,       // micro attack biar gak klik
    releaseMs = 20,     // micro release
  } = opts;

  const ctxRef  = useRef(null);
  const gainRef = useRef(null);
  const bufRef  = useRef(null);
  const usingBusRef = useRef(false);

  // Preload & wire ke bus global kalau ada
  useEffect(() => {
    let mounted = true;
    const bus = getGlobalBus();

    if (bus) {
      ctxRef.current = bus.ctx;
      gainRef.current = bus.ctx.createGain();
      // level lokal SFX; master volume & fade global terjadi di bus
      gainRef.current.gain.value = 1;
      gainRef.current.connect(bus.busGain);
      usingBusRef.current = true;
    } else {
      // Fallback (harusnya jarang kepakai)
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const g = ctx.createGain();
      g.gain.value = 1;
      g.connect(ctx.destination);
      gainRef.current = g;
      usingBusRef.current = false;
    }

    // decode buffer
    (async () => {
      try {
        const res = await fetch(src, { cache: "force-cache" });
        const ab  = await res.arrayBuffer();
        const buf = await ctxRef.current.decodeAudioData(ab);
        if (mounted) bufRef.current = buf;
      } catch {}
    })();

    return () => { mounted = false; };
  }, [src]);

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

    // Hormati toggle global
    if (audio?.muted) return;

    const ctx = ctxRef.current;
    const g   = gainRef.current;
    const buf = bufRef.current;

    // Kalau belum siap, skip
    if (!ctx || !g || !buf) return;

    // Pastikan context jalan
    if (ctx.state === "suspended") { try { ctx.resume(); } catch {} }

    // Buat source
    const srcNode = ctx.createBufferSource();
    srcNode.buffer = buf;
    srcNode.playbackRate.value = pickRate();

    // Level akhir = master Vol dari provider * vol per-SFX
    const sfxGain = (audio?.volume ?? 1) * volume;

    // Micro envelope biar halus + tetap ikut bus fade
    const nowT = ctx.currentTime;
    try {
      g.gain.cancelScheduledValues(nowT);
      g.gain.setValueAtTime(0, nowT);
      g.gain.linearRampToValueAtTime(sfxGain, nowT + (attackMs / 1000));
      g.gain.linearRampToValueAtTime(0, nowT + (attackMs + releaseMs) / 1000 + buf.duration);
    } catch {
      // fallback: set langsung (tetap akan kena bus fade global)
      g.gain.value = sfxGain;
    }

    srcNode.connect(g);

    // Cleanup setelah selesai
    srcNode.onended = () => {
      try { srcNode.disconnect(); } catch {}
    };

    try { srcNode.start(0); } catch {}
  }, [audio?.muted, audio?.volume, volume, rate, throttleMs, attackMs, releaseMs]);
}
