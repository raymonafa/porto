"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

const AudioCtx = createContext(null);

const LS_MUTED  = "mm_audio_muted";
const LS_VOLUME = "mm_audio_volume";

// Durasi fade bus (ms) saat toggle mute/unmute
const FADE_MS = 220;

export default function AudioProvider({
  src = "/audio/bg.mp3",
  initialVolume = 0.01,
  enableReverseGrain = true,
  children,
}) {
  // Elemen <audio> untuk BGM
  const audioRef   = useRef(null);

  // WebAudio graph
  const ctxRef     = useRef(null);
  const srcNodeRef = useRef(null);
  const filterRef  = useRef(null);
  const busGainRef = useRef(null);   // ⬅️ master bus untuk fade

  // Buffer untuk efek granular reverse
  const fwdBufRef  = useRef(null);
  const revBufRef  = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted]     = useState(false);
  const [volume, setVolume]   = useState(initialVolume);

  /* ========= Hydrate persisted ========= */
  useEffect(() => {
    try {
      const m = localStorage.getItem(LS_MUTED);
      const v = localStorage.getItem(LS_VOLUME);
      if (m != null) setMuted(m === "1");
      if (v != null) setVolume(Math.max(0, Math.min(1, parseFloat(v))));
    } catch {}
  }, []);

  /* ========= Build <audio> element ========= */
  useEffect(() => {
    const el = new Audio();
    el.src = src;
    el.loop = true;
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    el.volume = volume;  // element-level volume; busGain untuk fade master
    el.muted  = muted;

    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    audioRef.current = el;

    return () => {
      try { el.pause(); } catch {}
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      audioRef.current = null;
    };
  }, [src]);

  /* ========= Web Audio graph ========= */
  useEffect(() => {
    if (!audioRef.current) return;

    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    ctxRef.current = ctx;

    const srcNode = ctx.createMediaElementSource(audioRef.current);
    const busGain = ctx.createGain();           // master bus
    const filter  = ctx.createBiquadFilter();   // low-pass untuk scratch/modulasi
    filter.type = "lowpass";
    filter.frequency.value = 16000;

    // Graph: element -> busGain -> filter -> destination
    srcNode.connect(busGain);
    busGain.connect(filter);
    filter.connect(ctx.destination);

    // initial bus gain (0 kalau muted saat start, else 1)
    busGain.gain.value = (audioRef.current.muted ? 0 : 1);

    srcNodeRef.current = srcNode;
    filterRef.current  = filter;
    busGainRef.current = busGain;

    // Pre-decode untuk granular reverse (scratch burst)
    (async () => {
      try {
        const res = await fetch(src, { cache: "force-cache" });
        const ab  = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(ab.slice(0));
        fwdBufRef.current = buf;

        // buat reversed buffer
        const rev = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
        for (let ch = 0; ch < buf.numberOfChannels; ch++) {
          const s = buf.getChannelData(ch);
          const d = rev.getChannelData(ch);
          for (let i = 0, j = s.length - 1; i < s.length; i++, j--) d[i] = s[j];
        }
        revBufRef.current = rev;
      } catch {}
    })();

    return () => {
      try { srcNode.disconnect(); } catch {}
      try { busGain.disconnect(); } catch {}
      try { filter.disconnect(); } catch {}
      // biarkan ctx di-GC
    };
  }, [src]);

  /* ========= Persist & apply ========= */
  useEffect(() => {
    try { localStorage.setItem(LS_VOLUME, String(volume)); } catch {}
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    try { localStorage.setItem(LS_MUTED, muted ? "1" : "0"); } catch {}
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  /* ========= Helpers ========= */
  const resumeCtxIfNeeded = useCallback(async () => {
    if (ctxRef.current && ctxRef.current.state === "suspended") {
      try { await ctxRef.current.resume(); } catch {}
    }
  }, []);

  const play = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      await resumeCtxIfNeeded();
      await el.play();
    } catch {}
  }, [resumeCtxIfNeeded]);

  const pause = useCallback(() => {
    try { audioRef.current?.pause(); } catch {}
  }, []);

  // Fade master bus gain (0..1)
  const fadeBusTo = useCallback((target, ms = FADE_MS) => {
    const g = busGainRef.current?.gain;
    const ctx = ctxRef.current;
    if (!g || !ctx) return;
    const now = ctx.currentTime;
    const start = g.value;
    // gunakan exponentialApproach-ish dengan setTargetAtTime yang smooth
    try {
      g.cancelScheduledValues(now);
      g.setValueAtTime(start, now);
      // timeConstant kira-kira ~ ms/5 (semakin kecil semakin cepat)
      const timeConstant = Math.max(0.01, (ms / 1000) / 5);
      g.setTargetAtTime(target, now, timeConstant);
    } catch {
      // fallback langsung
      g.value = target;
    }
  }, []);

  const doBroadcast = useCallback((m) => {
    try {
      window.__mmAudioMuted = m;
      window.dispatchEvent(new CustomEvent("mm:audio:state", { detail: { muted: m, volume } }));
    } catch {}
  }, [volume]);

  const toggleMuted = useCallback(async () => {
    const next = !muted;
    if (next) {
      // Mute → fade out, lalu set flag
      fadeBusTo(0, FADE_MS);
      setMuted(true);
      doBroadcast(true);
    } else {
      // Unmute → pastikan play, lalu fade in
      await play();
      fadeBusTo(1, FADE_MS);
      setMuted(false);
      doBroadcast(false);
    }
  }, [muted, play, fadeBusTo, doBroadcast]);

  // Setter yang aman: kalau ada komponen lain panggil setMuted, tetap pakai fade
  const safeSetMuted = useCallback(async (next) => {
    const resolveNext = (prev) => (typeof next === "function" ? !!next(prev) : !!next);
    // gunakan functional update agar konsisten
    setMuted(async (prev) => {
      const n = resolveNext(prev);
      if (n) {
        fadeBusTo(0, FADE_MS);
        doBroadcast(true);
      } else {
        await play();
        fadeBusTo(1, FADE_MS);
        doBroadcast(false);
      }
      return n;
    });
  }, [play, fadeBusTo, doBroadcast]);

  /* ========= Start rules (overlay / reveal / gesture) — respect mute ========= */
  useEffect(() => {
    const tryPlay = async () => { if (!muted && !playing) await play(); };
    const onOverlay = () => void tryPlay();
    const onReveal  = () => void tryPlay();
    const onGesture = () => void tryPlay();
    window.addEventListener("mm:overlay:done", onOverlay);
    window.addEventListener("app:transition:reveal:done", onReveal);
    window.addEventListener("mm:user-gesture", onGesture);
    return () => {
      window.removeEventListener("mm:overlay:done", onOverlay);
      window.removeEventListener("app:transition:reveal:done", onReveal);
      window.removeEventListener("mm:user-gesture", onGesture);
    };
  }, [muted, playing, play]);

  /* ========= Scratch / modulation dari grid velocity ========= */
  const reactSimple = useCallback((vx, vy) => {
    const el = audioRef.current;
    const filter = filterRef.current;
    if (!el || !filter) return;

    const speed = Math.min(1, Math.hypot(vx, vy) / 12);
    const sign  = Math.sign(vx) || 0;

    // playbackRate 0.5..1.7
    const targetRate = Math.max(0.5, Math.min(1.7, 1 + sign * 0.7 * speed));
    el.playbackRate += (targetRate - el.playbackRate) * 0.2;

    // low-pass 2k .. 18k (kencang → lebih muffle)
    const targetHz = 18000 - speed * 16000;
    const t = ctxRef.current?.currentTime ?? 0;
    try { filter.frequency.setTargetAtTime(targetHz, t, 0.06); }
    catch { filter.frequency.value = targetHz; }
  }, []);

  const lastBurstRef = useRef(0);
  const reverseBurst = useCallback(() => {
    if (!enableReverseGrain || muted) return;
    const ctx = ctxRef.current, rev = revBufRef.current, fwd = fwdBufRef.current;
    if (!ctx || !rev || !fwd) return;

    const now = performance.now();
    if (now - lastBurstRef.current < 140) return;
    lastBurstRef.current = now;

    const el = audioRef.current;
    const pos = Math.max(0, Math.min(fwd.duration - 0.05, el?.currentTime ?? 0));

    const grainDur  = 0.22;
    const revOffset = Math.max(0, rev.duration - pos - grainDur);

    const src = ctx.createBufferSource();
    src.buffer = rev;

    const g = ctx.createGain();
    const master = Math.max(0, Math.min(1, volume));
    g.gain.value = 0;

    src.connect(g);
    g.connect(ctx.destination);

    const ct = ctx.currentTime;
    g.gain.setValueAtTime(0, ct);
    g.gain.linearRampToValueAtTime(0.28 * master, ct + 0.02);
    g.gain.linearRampToValueAtTime(0, ct + grainDur);

    try { src.start(ct, revOffset, grainDur); } catch {}
  }, [enableReverseGrain, muted, volume]);

  useEffect(() => {
    const onVel = (e) => {
      const { vx = 0, vy = 0 } = e.detail || {};
      // gesture-like: kalau belum play & tidak muted, coba play
      if (!muted && !playing) void play();
      reactSimple(vx, vy);
      if (vx < -4) reverseBurst();
    };
    window.addEventListener("mm:grid:velocity", onVel);
    return () => window.removeEventListener("mm:grid:velocity", onVel);
  }, [muted, playing, play, reactSimple, reverseBurst]);

  /* ========= Context API ========= */
  const api = useMemo(() => ({
    playing, muted, volume,
    play, pause,
    toggleMuted,
    setMuted: safeSetMuted,   // ⬅️ setter yang tetap pakai fade
    setVolume,
  }), [playing, muted, volume, play, pause, toggleMuted, safeSetMuted, setVolume]);

  return <AudioCtx.Provider value={api}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
  return useContext(AudioCtx);
}
