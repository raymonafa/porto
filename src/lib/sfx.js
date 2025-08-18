// src/lib/sfx.js
"use client";

import { useEffect, useMemo, useRef } from "react";

// Single AudioContext + decode buffer cache (hemat performa)
const ctxBox = { ctx: null };
const bufferCache = new Map();

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctxBox.ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    ctxBox.ctx = new Ctx();
  }
  return ctxBox.ctx;
}

/**
 * Reusable SFX hook.
 * @param {string} url - path audio (contoh: "/sfx/hover.mp3")
 * @param {object} opts - { volume, rate:[min,max], throttleMs }
 */
export function useSfx(
  url,
  { volume = 0.5, rate = [1, 1], throttleMs = 100 } = {}
) {
  const gainRef = useRef(null);
  const bufRef = useRef(null);
  const lastRef = useRef(0);

  useEffect(() => {
    const ctx = getCtx();
    if (!ctx) return;

    // gain node sekali saja per instansi hook
    const gain = ctx.createGain();
    gain.gain.value = volume;
    gain.connect(ctx.destination);
    gainRef.current = gain;

    let cancelled = false;
    (async () => {
      if (bufferCache.has(url)) {
        bufRef.current = bufferCache.get(url);
        return;
      }
      const res = await fetch(url);
      const ab = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab);
      if (!cancelled) {
        bufferCache.set(url, buf);
        bufRef.current = buf;
      }
    })();

    return () => {
      cancelled = true;
      // biarkan ctx & buffer di-cache (jangan di-dispose)
    };
  }, [url, volume]);

  // stable play()
  return useMemo(() => {
    return () => {
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();

      const buf = bufRef.current;
      const gain = gainRef.current;
      if (!buf || !gain) return;

      const now = performance.now();
      if (now - lastRef.current < throttleMs) return; // anti spam
      lastRef.current = now;

      const src = ctx.createBufferSource();
      src.buffer = buf;
      const [minR, maxR] = rate;
      src.playbackRate.value = minR + Math.random() * (maxR - minR);
      src.connect(gain);
      src.start();
    };
  }, [rate, throttleMs]);
}
