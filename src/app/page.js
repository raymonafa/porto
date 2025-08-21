// src/app/page.js
"use client";

import Canvas3D from "@/components/Canvas3D";
import MouseTrail from "@/components/MouseTrail";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import RevealGate from "@/components/RevealGate";
import RouteReadyPing from "@/components/RouteReadyPing";

const asciiCharacters = ["⁕", "※", "⊙", "∘", "∀", "9", "1", ">", "-", "6"];

export default function Home() {
  // 2 teks: MANAMONA (kiri) & 2025 (kanan)
  const texts = useMemo(() => ["MANAMONA", "2025"], []);
  const [typed, setTyped] = useState(["", ""]);      // overlay typing
  const [typingComplete, setTypingComplete] = useState(false);

  // Hydration-safe
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // Overlay + FLIP refs/state
  const overlayRef = useRef(null);   // overlay BG only
  const leftRef = useRef(null);      // MANAMONA
  const rightRef = useRef(null);     // 2025
  const contentRef = useRef(null);

  const overlayDoneRef = useRef(false);
  const [showContent, setShowContent] = useState(false);
  const [overlayActive, setOverlayActive] = useState(true);     // z-index control
  const [overlayCentered, setOverlayCentered] = useState(true); // true: center row, false: edges
  const didRunFlip = useRef(false); // guard FLIP agar tidak rerun

  // ===== Knobs =====
  const TYPING_START_DELAY_MS = 1200;
  const SCRAMBLE_MS = 20;
  const REVEAL_MS = 200;
  const REVEAL_STAGGER_MS = 220;
  const CENTER_HOLD_MS = 1400;
  const SLIDE_MS = 1000;
  const CONTENT_DELAY_MS = 200;

  // Typing per karakter: scramble + reveal
  useEffect(() => {
    if (!isMounted || !overlayActive) return;

    const scrambleTimers = [];
    const revealTimers = [];
    const startTimers = [];

    const runTyping = (idx, text) => {
      let revealIndex = 0;
      let stopped = false;

      const scramble = () => {
        if (stopped) return;
        const out = text
          .split("")
          .map((ch, j) =>
            j < revealIndex
              ? ch
              : asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)]
          )
          .join("");
        setTyped((prev) => {
          const next = [...prev];
          next[idx] = out;
          return next;
        });
        scrambleTimers[idx] = setTimeout(scramble, SCRAMBLE_MS);
      };

      const reveal = () => {
        if (stopped) return;
        revealIndex += 1;
        if (revealIndex > text.length) {
          stopped = true;
          if (scrambleTimers[idx]) clearTimeout(scrambleTimers[idx]);
          setTyped((prev) => {
            const next = [...prev];
            next[idx] = text;
            return next;
          });
          return;
        }
        revealTimers[idx] = setTimeout(reveal, REVEAL_MS);
      };

      scramble();
      revealTimers[idx] = setTimeout(reveal, REVEAL_MS);
    };

    texts.forEach((text, idx) => {
      startTimers[idx] = setTimeout(
        () => runTyping(idx, text),
        TYPING_START_DELAY_MS + idx * REVEAL_STAGGER_MS
      );
    });

    return () => {
      startTimers.forEach((t) => t && clearTimeout(t));
      revealTimers.forEach((t) => t && clearTimeout(t));
      scrambleTimers.forEach((t) => t && clearTimeout(t));
    };
  }, [isMounted, overlayActive, texts]);

  // keduanya selesai diketik → typingComplete sekali saja
  useEffect(() => {
    if (!overlayActive) return;
    if (!typingComplete && typed[0] === texts[0] && typed[1] === texts[1]) {
      setTypingComplete(true);
    }
  }, [typed, overlayActive, typingComplete, texts]);

  // GSAP FLIP: center → justify-between (edges) setelah typing selesai
  useLayoutEffect(() => {
    if (!isMounted || !overlayActive || !typingComplete || didRunFlip.current) return;
    if (!leftRef.current || !rightRef.current || !overlayRef.current) return;

    didRunFlip.current = true;

    gsap.set(overlayRef.current, { autoAlpha: 1 });

    const L = leftRef.current;
    const R = rightRef.current;

    // 1) Measure posisi AWAL (row masih centered)
    const l0 = L.getBoundingClientRect();
    const r0 = R.getBoundingClientRect();

    // 2) Switch layout ke justify-between (final)
    setOverlayCentered(false);

    // 3) Tunggu DOM apply, lalu measure AKHIR dan set transform agar tampak tetap di tempat
    requestAnimationFrame(() => {
      const l1 = L.getBoundingClientRect();
      const r1 = R.getBoundingClientRect();

      const dxL = l0.left - l1.left;
      const dxR = r0.left - r1.left;

      gsap.set([L, R], { willChange: "transform" });
      gsap.set(L, { x: dxL });
      gsap.set(R, { x: dxR });

      // 4) Timeline: HOLD → SLIDE → DELAY → mount content
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to({}, { duration: CENTER_HOLD_MS / 1000 })
        .to(L, { x: 0, duration: SLIDE_MS / 1000 }, 0)
        .to(R, { x: 0, duration: SLIDE_MS / 1000 }, 0)
        .to({}, { duration: CONTENT_DELAY_MS / 1000 })
        .add(() => setShowContent(true));
    });
  }, [isMounted, overlayActive, typingComplete]);

  // Konten dimount → fade-in konten & fade-out overlay,
  // lalu kirim sinyal ke Navbar *dan* ke AudioProvider (autoplay)
  useEffect(() => {
    if (!showContent) return;
    if (!contentRef.current || !overlayRef.current) return;

    gsap.set(contentRef.current, { autoAlpha: 0 });

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.to(contentRef.current, { autoAlpha: 1, duration: 0.6 }, 0);
    tl.to(
      overlayRef.current,
      {
        autoAlpha: 0,
        duration: 0.45,
        onComplete: () => {
          overlayDoneRef.current = true;
          setOverlayActive(false);
          // 🔔 Beri sinyal ke Navbar agar reveal from bottom
          window.dispatchEvent(new Event("mm:reveal:nav"));
          // 🔔 Beri sinyal ke AudioProvider → coba autoplay BGM
          window.dispatchEvent(new Event("mm:overlay:done"));
        },
      },
      "-=0.2"
    );

    return () => tl.kill();
  }, [showContent]);

  return (
    <RevealGate enabled timeout={1500}>
      <main className="relative h-screen w-screen overflow-hidden bg-[#f8f8f8] font-mono text-black">
        {/* Route ready ping (sinkron dengan PixelTransition) */}
        <RouteReadyPing />

        {/* OVERLAY BG ONLY (non-blocking pointer) */}
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[9998] bg-[#f8f8f8] pointer-events-none"
        />

        {/* Small text — dipakai untuk overlay & posisi final (single DOM) */}
        <div
          className={`pointer-events-none absolute left-0 top-1/2 ${
            overlayActive ? "z-[9999]" : "z-20"
          } w-full px-10 text-sm text-black -translate-y-1/2`}
        >
          <div
            className={`flex ${
              overlayCentered ? "justify-center gap-[2px]" : "justify-between"
            } select-none`}
          >
            {/* MANAMONA (kiri) */}
            <span ref={leftRef} suppressHydrationWarning>
              {overlayActive ? (typed[0] || "") : (typed[0] || texts[0])}
            </span>
            {/* 2025 (kanan) */}
            <span ref={rightRef} suppressHydrationWarning>
              {overlayActive ? (typed[1] || "") : (typed[1] || texts[1])}
            </span>
          </div>
        </div>

        {/* CONTENT (mounted after overlay timeline) */}
        {showContent && (
          <div ref={contentRef}>
            {/* efek yang tidak menghalangi klik */}
            <div className="pointer-events-none">
              <MouseTrail />
            </div>

            {/* Glow blur hijau */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
              <div className="h-[600px] w-[600px] rounded-full bg-[#D3FB43] blur-[150px] opacity-50" />
            </div>

            {/* Canvas 3D di depan headline */}
            <div className="absolute inset-0 z-30 pointer-events-none">
              <Canvas3D />
            </div>
          </div>
        )}
      </main>
    </RevealGate>
  );
}
