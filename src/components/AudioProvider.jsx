// src/components/AudioProvider.jsx
"use client";

import React, {
  createContext, useContext, useEffect, useMemo, useRef, useState,
} from "react";

const AudioCtx = createContext(null);

const LS_MUTED  = "mm_audio_muted";
const LS_VOLUME = "mm_audio_volume";

// util: bikin curve waveshaper yang hangat (soft saturation)
function makeWarmCurve(n = 512, k = 2.5) {
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1; // -1..1
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

export default function AudioProvider({
  src = "/audio/bg.mp3",
  initialVolume = 0.5,
  enableReverseGrain = true,
  children,
}) {
  const audioRef     = useRef(null);
  const ctxRef       = useRef(null);

  // graph nodes
  const srcNodeRef   = useRef(null);
  const preGainRef   = useRef(null);     // drive sebelum waveshaper
  const shaperRef    = useRef(null);     // karakter
  const filterRef    = useRef(null);     // low-pass dinamis
  const panRef       = useRef(null);     // stereo panning
  const masterRef    = useRef(null);     // master gain
  const compRef      = useRef(null);     // gentle glue

  // buffers utk granular
  const fwdBufRef    = useRef(null);
  const revBufRef    = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted]     = useState(false);
  const [volume, setVolume]   = useState(initialVolume);

  // ====== hydrate persisted ======
  useEffect(() => {
    try {
      const m = localStorage.getItem(LS_MUTED);
      const v = localStorage.getItem(LS_VOLUME);
      if (m != null) setMuted(m === "1");
      if (v != null) setVolume(Math.max(0, Math.min(1, parseFloat(v))));
    } catch {}
  }, []);

  // ====== build <audio> ======
  useEffect(() => {
    const el = new Audio();
    el.src = src;
    el.loop = true;
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    el.volume = volume;
    el.muted  = muted;

    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    audioRef.current = el;

    return () => {
      el.pause();
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      audioRef.current = null;
    };
  }, [src]);

  // ====== Web Audio graph (karakter + panning) ======
  useEffect(() => {
    if (!audioRef.current) return;

    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    ctxRef.current = ctx;

    const source   = ctx.createMediaElementSource(audioRef.current);
    const preGain  = ctx.createGain();               // drive in → waveshaper
    const shaper   = ctx.createWaveShaper(); shaper.curve = makeWarmCurve(1024);
    const lpf      = ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 14000;
    const panner   = ctx.createStereoPanner(); panner.pan.value = 0;
    const master   = ctx.createGain(); master.gain.value = 1;      // master chain
    const comp     = ctx.createDynamicsCompressor();                // halus tipis
    comp.threshold.value = -14; comp.knee.value = 24; comp.ratio.value = 2; comp.attack.value = 0.02; comp.release.value = 0.2;

    // chain: source -> lpf -> preGain -> shaper -> panner -> master -> comp -> destination
    source.connect(lpf);
    lpf.connect(preGain);
    preGain.connect(shaper);
    shaper.connect(panner);
    panner.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);

    srcNodeRef.current = source;
    preGainRef.current = preGain;
    shaperRef.current  = shaper;
    filterRef.current  = lpf;
    panRef.current     = panner;
    masterRef.current  = master;
    compRef.current    = comp;

    // siapkan granular buffers
    (async () => {
      try {
        const res = await fetch(src, { cache: "force-cache" });
        const ab  = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(ab.slice(0));
        fwdBufRef.current = buf;

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
      try { source.disconnect(); } catch {}
      try { lpf.disconnect(); } catch {}
      try { preGain.disconnect(); } catch {}
      try { shaper.disconnect(); } catch {}
      try { panner.disconnect(); } catch {}
      try { master.disconnect(); } catch {}
      try { comp.disconnect(); } catch {}
    };
  }, [src]);

  // ====== persist & apply ======
  useEffect(() => {
    try { localStorage.setItem(LS_VOLUME, String(volume)); } catch {}
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    try { localStorage.setItem(LS_MUTED, muted ? "1" : "0"); } catch {}
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  // ====== controls ======
  const play = async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      if (ctxRef.current?.state === "suspended") await ctxRef.current.resume();
      await el.play();
    } catch {}
  };
  const pause       = () => audioRef.current?.pause();
  const toggleMuted = () => setMuted(m => !m);

  // ====== start rules (overlay, reveal, gesture) – respect mute ======
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
  }, [muted, playing]);

  /* ------------------------------------------------------------------
     SCRATCH ENGINE – karakter ala Phantom
     - rate + LPF modulasi (halus)
     - stereo pan kiri/kanan sesuai arah drag
     - drive (preGain) naik saat kencang → warna hangat
     - micro grains (fwd/rev) menimpa musik → tekstur scratch
     - chirp saat ganti arah mendadak
     - brake bounce saat mendadak berhenti
  -------------------------------------------------------------------*/

  // helper pan/drive
  const setPanAndDrive = (vx, speed01) => {
    const pan = panRef.current;
    const pre = preGainRef.current;
    if (!pan || !pre) return;

    // map vx (-∞..∞) → [-0.85..0.85]
    const panTarget = Math.max(-0.85, Math.min(0.85, vx / 14));
    const t = ctxRef.current?.currentTime ?? 0;
    try { pan.pan.setTargetAtTime(panTarget, t, 0.06); } catch { pan.pan.value = panTarget; }

    // drive: 1.0 .. 2.2 (masuk shaper)
    const drive = 1.0 + speed01 * 1.2;
    try { pre.gain.setTargetAtTime(drive, t, 0.06); } catch { pre.gain.value = drive; }
  };

  // haluskan rate & filter frekuensi
  const smoothColor = (vx, vy) => {
    const el = audioRef.current;
    const lpf = filterRef.current;
    if (!el || !lpf) return;

    const speed = Math.min(1, Math.hypot(vx, vy) / 12);       // 0..1
    const sign  = Math.sign(vx) || 0;

    // playbackRate 0.6..1.6
    const targetRate = 1 + sign * 0.6 * speed;
    el.playbackRate += (targetRate - el.playbackRate) * 0.12;

    // low-pass 3k..16k
    const targetHz = 16000 - speed * 13000;
    const t = ctxRef.current?.currentTime ?? 0;
    try { lpf.frequency.setTargetAtTime(targetHz, t, 0.05); } catch { lpf.frequency.value = targetHz; }

    setPanAndDrive(vx, speed);
  };

  // schedule 1 grain (fwd/rev) dengan envelope singkat
  const lastGrainRef = useRef(0);
  const scheduleGrain = (opts) => {
    const {
      reverse = false, rate = 1, vol = 0.18, dur = 0.14, jitter = 0.004,
    } = opts || {};
    if (muted) return;

    const ctx = ctxRef.current;
    const shaper = shaperRef.current;
    const panner = panRef.current;
    const master = masterRef.current;
    const fwd = fwdBufRef.current;
    const rev = revBufRef.current;
    if (!ctx || !shaper || !panner || !master || !fwd || !rev) return;

    // throttle grains biar gak banjir
    const now = performance.now();
    if (now - lastGrainRef.current < 28) return;
    lastGrainRef.current = now;

    const buf = reverse ? rev : fwd;

    // align ke posisi musik supaya “nyatu”
    const el = audioRef.current;
    const pos = Math.max(0, Math.min(fwd.duration - 0.05, el?.currentTime ?? 0));

    // offset with a bit of jitter supaya organik
    const off = Math.max(0, Math.min(buf.duration - dur - 0.01, pos + (Math.random() * 2 - 1) * jitter));

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;

    // envelope & route: g -> shaper -> panner -> master
    const g = ctx.createGain();
    g.gain.value = 0;

    src.connect(g);
    g.connect(shaper);

    const ct = ctx.currentTime;
    const masterVol = Math.max(0, Math.min(1, volume));
    // quick in/out envelope
    g.gain.setValueAtTime(0, ct);
    g.gain.linearRampToValueAtTime(vol * masterVol, ct + 0.015);
    g.gain.linearRampToValueAtTime(0, ct + dur);

    try { src.start(ct, off, dur); } catch {}
  };

  // chirp ketika ganti arah keras
  const lastSignRef = useRef(0);
  const lastSpeedRef = useRef(0);

  // brake saat stop mendadak
  const brake = () => {
    const el = audioRef.current;
    const lpf = filterRef.current;
    if (!el || !lpf) return;
    const t = ctxRef.current?.currentTime ?? 0;

    // kecilkan rate lalu balik ke 1
    const cur = el.playbackRate || 1;
    const mid = Math.max(0.65, cur * 0.75);
    const step = () => {
      // gunakan CSS-like lerp manual karena element gak punya automation
      el.playbackRate += (mid - el.playbackRate) * 0.35;
      if (Math.abs(el.playbackRate - mid) > 0.02) requestAnimationFrame(step);
      else {
        const back = () => {
          el.playbackRate += (1 - el.playbackRate) * 0.15;
          if (Math.abs(el.playbackRate - 1) > 0.02) requestAnimationFrame(back);
        };
        back();
      }
    };
    requestAnimationFrame(step);

    // turunkan LPF cepat lalu naik
    try {
      lpf.frequency.setTargetAtTime(2500, t, 0.02);
      lpf.frequency.setTargetAtTime(12000, t + 0.18, 0.1);
    } catch {}
  };

  // dengarkan velocity dari grid
  useEffect(() => {
    const onVel = (e) => {
      const { vx = 0, vy = 0 } = e.detail || {};
      // auto-start kalau user sudah interact & unmuted
      if (!muted && !playing) void play();

      // warna dasar
      smoothColor(vx, vy);

      const speed = Math.min(1, Math.hypot(vx, vy) / 12);
      const sign  = Math.sign(vx) || 0;

      // grains: makin kencang makin sering & panjang
      if (!muted && speed > 0.15) {
        const rev = vx < -2.2;                               // kiri → reverse lebih sering
        const rate = (rev ? 0.85 : 1.05) + (Math.random() * 0.14 - 0.07) + sign * 0.18 * speed;
        const vol  = 0.10 + speed * 0.28;
        const dur  = 0.08 + speed * 0.14;
        scheduleGrain({ reverse: rev, rate, vol, dur });
      }

      // chirp saat ganti arah mendadak & cukup cepat
      if (lastSignRef.current && sign && lastSignRef.current !== sign && lastSpeedRef.current > 0.4) {
        scheduleGrain({ reverse: sign < 0, rate: sign < 0 ? 0.9 : 1.15, vol: 0.22, dur: 0.11, jitter: 0.002 });
      }
      lastSignRef.current = sign;

      // brake saat berhenti tiba-tiba
      if (lastSpeedRef.current > 0.55 && speed < 0.08) brake();
      lastSpeedRef.current = speed;
    };

    window.addEventListener("mm:grid:velocity", onVel);
    return () => window.removeEventListener("mm:grid:velocity", onVel);
  }, [muted, playing, volume, enableReverseGrain]);

  // ====== context API ======
  const api = useMemo(() => ({
    playing, muted, volume,
    play, pause, toggleMuted, setMuted, setVolume,
  }), [playing, muted, volume]);

  return <AudioCtx.Provider value={api}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
  return useContext(AudioCtx);
}
