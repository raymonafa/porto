// src/app/page.js
"use client";

import Canvas3D from "@/components/Canvas3D";
import MouseTrail from "@/components/MouseTrail";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import RevealGate from "@/components/RevealGate";
import RouteReadyPing from "@/components/RouteReadyPing";
import HeadlineLayer from "@/components/HeadlinePixelReveal";
// import CustomCursor from "@/components/CustomCursor";

const asciiCharacters = ["✧", "■", "o", "∘", "∀", "M", "1", ">", "N", "☺︎"];

export default function Home() {
  // overlay typing
  const texts = useMemo(() => ["MANAMONA", "2025"], []);
  const [typed, setTyped] = useState(["", ""]);
  const [typingComplete, setTypingComplete] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const overlayRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const contentRef = useRef(null);

  const overlayDoneRef = useRef(false);
  const [showContent, setShowContent] = useState(false);
  const [overlayActive, setOverlayActive] = useState(true);
  const [overlayCentered, setOverlayCentered] = useState(true);
  const didRunFlip = useRef(false);

  // Canvas timing: 100ms setelah headline start (sekali)
  const [showCanvas, setShowCanvas] = useState(false);
  const canvasTimerRef = useRef(null);
  const canvasShownRef = useRef(false);

  // knobs
  const TYPING_START_DELAY_MS = 1200;
  const SCRAMBLE_MS = 20;
  const REVEAL_MS = 200;
  const REVEAL_STAGGER_MS = 220;
  const CENTER_HOLD_MS = 1400;
  const SLIDE_MS = 1000;
  const CONTENT_DELAY_MS = 200;

  /* ===== Typing overlay ===== */
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

  /* ===== Mark typing done ===== */
  useEffect(() => {
    if (!overlayActive) return;
    if (!typingComplete && typed[0] === texts[0] && typed[1] === texts[1]) {
      setTypingComplete(true);
    }
  }, [typed, overlayActive, typingComplete, texts]);

  /* ===== FLIP center → edges ===== */
  useLayoutEffect(() => {
    if (!isMounted || !overlayActive || !typingComplete || didRunFlip.current) return;
    if (!leftRef.current || !rightRef.current || !overlayRef.current) return;

    didRunFlip.current = true;

    gsap.set(overlayRef.current, { autoAlpha: 1 });

    const L = leftRef.current;
    const R = rightRef.current;

    const l0 = L.getBoundingClientRect();
    const r0 = R.getBoundingClientRect();

    setOverlayCentered(false);

    requestAnimationFrame(() => {
      const l1 = L.getBoundingClientRect();
      const r1 = R.getBoundingClientRect();

      const dxL = l0.left - l1.left;
      const dxR = r0.left - r1.left;

      gsap.set([L, R], { willChange: "transform" });
      gsap.set(L, { x: dxL });
      gsap.set(R, { x: dxR });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to({}, { duration: CENTER_HOLD_MS / 1000 })
        .to(L, { x: 0, duration: SLIDE_MS / 1000 }, 0)
        .to(R, { x: 0, duration: SLIDE_MS / 1000 }, 0)
        .to({}, { duration: CONTENT_DELAY_MS / 1000 })
        .add(() => setShowContent(true));
    });
  }, [isMounted, overlayActive, typingComplete]);

  /* ===== Show content, overlay fade-out only (headline/canvas no fade) ===== */
  useEffect(() => {
    if (!showContent) return;
    if (!contentRef.current || !overlayRef.current) return;

    // Jangan fade-in konten → set langsung visible
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.set(contentRef.current, { autoAlpha: 1 }, 0);
    tl.to(
      overlayRef.current,
      {
        autoAlpha: 0,
        duration: 0.45,
        onComplete: () => {
          overlayDoneRef.current = true;
          setOverlayActive(false);
          window.dispatchEvent(new Event("mm:reveal:nav"));
          window.dispatchEvent(new Event("mm:overlay:done"));
        },
      },
      0
    );
    return () => tl.kill();
  }, [showContent]);

  /* ===== Start headline (0ms) & canvas (+100ms) sekali ===== */
  useEffect(() => {
    if (!showContent || canvasShownRef.current) return;
    canvasShownRef.current = true; // guard supaya nggak ulang
    canvasTimerRef.current = setTimeout(() => {
      setShowCanvas(true);
    }, 100);
    return () => {
      if (canvasTimerRef.current) clearTimeout(canvasTimerRef.current);
    };
  }, [showContent]);

  return (
    <RevealGate enabled timeout={1500}>
      <main
        className="relative h-screen w-screen overflow-hidden bg-[#f8f8f8] font-mono text-black"
        style={{ cursor: "none" }}
      >
        <RouteReadyPing />

        {/* OVERLAY BG ONLY (non-blocking pointer) */}
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[9998] bg-[#f8f8f8] pointer-events-none"
        />

        {/* Small text overlay */}
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
            <span ref={leftRef} suppressHydrationWarning>
              {overlayActive ? (typed[0] || "") : (typed[0] || texts[0])}
            </span>
            <span ref={rightRef} suppressHydrationWarning>
              {overlayActive ? (typed[1] || "") : (typed[1] || texts[1])}
            </span>
          </div>
        </div>

        {/* CONTENT */}
        {showContent && (
          <div ref={contentRef}>
            {/* trail effect */}
            <div className="pointer-events-none">
              <MouseTrail />
            </div>

            {/* Glow blur hijau (paling belakang) */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
              <div className="h-[600px] w-[600px] rounded-full bg-[#D3FB43] blur-[150px] opacity-10" />
            </div>

            {/* Headline SVG — pixel grid reveal only (no fade) */}
            <HeadlineLayer
              zIndexClass="z-20"
              layout="centered"
              width="min(90vw, 720px)"   // bisa juga angka: 880
              color="#b0b0b0ff"               // bebas atur warna
              cols={28}
              duration={0.9}
            />

            {/* Canvas 3D — muncul 100ms setelah headline mulai, tanpa fade */}
            {showCanvas && (
              <div className="absolute inset-0 z-30 pointer-events-none">
                <Canvas3D />
              </div>
            )}
          </div>
        )}

        {/* <CustomCursor size={24} hotspot={{ x: 2, y: 2 }} src="/cursors/default.svg" /> */}
      </main>
    </RevealGate>
  );
}
