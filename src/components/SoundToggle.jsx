// src/components/SoundToggle.jsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { useAudio } from "@/components/AudioProvider";
import { useSfx } from "@/lib/sfx";

/**
 * Sound toggle bergaya ShapeButton + icon dots (sin-wave):
 * - Body dimask pakai SVG shape (#222 selalu).
 * - Icon: N baris (default 3), 8 kolom dalam grid 20×20.
 * - Animasi amplitude: sin + envelope GSAP power4.inOut (yoyo).
 */
export default function SoundToggle({
  className = "",
  shapeSrc = "/buttons/soundShape.svg",
  width = 112,
  height = 40,
  iconSize = 24,
  cols = 8,
  rows = 3,            // ← ganti ke 2 kalau mau 2 baris; 3 untuk 3 baris
}) {
  const audio = useAudio();
  const isOn = !!audio && audio.playing && !audio.muted;

  // sfx (respek mute global)
  const playHover = useSfx("/sfx/hover.mp3", { volume: 0.35, rate: [0.98, 1.05], throttleMs: 120 });
  const playClick = useSfx("/sfx/click.mp3", { volume: 0.5, rate: [0.98, 1.03], throttleMs: 120 });

  const label = isOn ? "Sound on" : "Muted";

  const SHAPE_COLOR = "#222222"; // selalu gelap (sesuai request)
  const DOT_COLOR   = "#D3FB43";

  /* =========================
   * DOT LAYOUT (rows × cols) pada grid 20×20
   * ========================= */
  const dotsData = useMemo(() => {
    const W = 20, H = 20;
    const mx = 1;                     // margin horizontal
    const my = 4;                     // margin vertical
    const xs = Array.from({ length: cols }, (_, i) =>
      mx + (i * (W - mx * 2)) / (cols - 1)
    );
    const ys = Array.from({ length: rows }, (_, r) =>
      my + (r * (H - my * 2)) / (rows - 1)
    );

    const arr = [];
    ys.forEach((y, r) => {
      xs.forEach((x, i) => {
        // fase horizontal + offset antar baris agar interleaved
        const rowOffset = (r - (rows - 1) / 2) * 0.22; // sedikit beda antar baris
        const phase = i * 0.55 + rowOffset;

        // weight lebih besar di tengah (kolom) + sedikit preferensi baris tengah
        const nx = (i - (cols - 1) / 2) / ((cols - 1) / 2);           // -1..1
        const ny = rows > 1 ? (r - (rows - 1) / 2) / ((rows - 1) / 2) : 0;
        const centerCol = 1 - Math.abs(nx);                           // 0..1
        const centerRow = 1 - Math.min(1, Math.abs(ny) * 0.9);        // 0..1
        const weight = 0.5 + 0.5 * (0.7 * centerCol + 0.3 * centerRow);

        arr.push({ cx: x, cy: y, phase, weight });
      });
    });
    return arr;
  }, [cols, rows]);

  // refs untuk circle
  const dotRefs = useRef([]);
  dotRefs.current = [];
  const setDotRef = (el) => el && dotRefs.current.push(el);

  /* =========================
   * GSAP envelope (power4.inOut)
   * ========================= */
  const envRef = useRef({ v: isOn ? 1 : 0.08 });
  const envTL  = useRef(null);

  useEffect(() => {
    if (envTL.current) envTL.current.kill();
    if (isOn) {
      // napas halus saat ON
      envRef.current.v = Math.max(envRef.current.v, 0.55);
      envTL.current = gsap.timeline({ repeat: -1, yoyo: true })
        .to(envRef.current, { v: 1.0, duration: 0.9, ease: "power4.inOut" })
        .to(envRef.current, { v: 0.55, duration: 0.9, ease: "power4.inOut" });
    } else {
      // cepat turun saat OFF
      envTL.current = gsap.timeline().to(envRef.current, { v: 0.08, duration: 0.4, ease: "power4.out" });
    }
    return () => { envTL.current && envTL.current.kill(); };
  }, [isOn]);

  /* =========================
   * Wave loop (phase jalan terus)
   * ========================= */
  useEffect(() => {
    let raf = 0;
    let phase = 0;
    const speedOn = 0.20;
    const speedOff = 0.06;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      phase += isOn ? speedOn : speedOff;

      // radius & opacity
      const baseR = 0.9;
      const maxAmpR = 1.05;            // amplitudo radius ON
      const minAmpR = 0.06;            // amplitudo radius OFF
      const ampR = (isOn ? maxAmpR : minAmpR) * envRef.current.v;

      const baseO = isOn ? 0.85 : 0.45;
      const ampO  = isOn ? 0.22 : 0.06;

      dotRefs.current.forEach((el, idx) => {
        const d = dotsData[idx]; if (!d) return;
        // sin + shaping biar crisp
        const s = Math.sin(phase + d.phase);
        const shaped = Math.sign(s) * Math.pow(Math.abs(s), 0.9);

        const r = Math.max(0.2, baseR + ampR * shaped * d.weight);
        const o = Math.max(0.12, Math.min(1, baseO + ampO * shaped * d.weight));

        el.setAttribute("r", r.toFixed(3));
        el.setAttribute("opacity", o.toFixed(3));
        el.setAttribute("fill", DOT_COLOR);
      });
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOn, dotsData]);

  return (
    <div
      className={`relative block shrink-0 leading-none ${className}`}
      style={{ width, height }}
      data-navbtn
    >
      <button
        className="absolute inset-0 block"
        aria-label={label}
        title={label}
        data-hover-interactive
        onMouseEnter={() => playHover()}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new Event("mm:user-gesture"));
          playClick();
          audio?.toggleMuted?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            window.dispatchEvent(new Event("mm:user-gesture"));
            playClick();
            audio?.toggleMuted?.();
          }
        }}
        style={{ cursor: "pointer" }}
      >
        {/* BODY MASK — selalu #222 */}
        <div
          aria-hidden
          className="w-full h-full"
          style={{
            backgroundColor: SHAPE_COLOR,
            WebkitMaskImage: `url(${shapeSrc})`,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            WebkitMaskPosition: "center",
            maskImage: `url(${shapeSrc})`,
            maskRepeat: "no-repeat",
            maskSize: "100% 100%",
            maskPosition: "center",
          }}
        />

        {/* ICON DOTS (grid 20×20) */}
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <svg width={iconSize} height={iconSize} viewBox="0 0 20 20" aria-hidden>
            {dotsData.map((d, i) => (
              <circle
                key={i}
                ref={setDotRef}
                cx={d.cx}
                cy={d.cy}
                r="0.9"
                fill={DOT_COLOR}
                opacity="0.7"
              />
            ))}
          </svg>
        </span>
      </button>
    </div>
  );
}
