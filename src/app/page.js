  // src/app/page.js
  "use client";

  import Canvas3D from "@/components/Canvas3D";
  import MouseTrail from "@/components/MouseTrail";
  import ShapeButton from "@/components/ShapeButton";
  import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
  import gsap from "gsap";

  const asciiCharacters = ["⁕", "※", "⊙", "∘", "∀", "9", "1", ">", "-", "6"];

  export default function Home() {
    // 2 teks: MANAMONA (kiri) & 2025 (kanan)
    const texts = useMemo(() => ["MANAMONA", "2025"], []);
    const [typed, setTyped] = useState(["", ""]);      // untuk overlay typing
    const [typingComplete, setTypingComplete] = useState(false);

    // glitch ringan setelah overlay (opsional)
    const [glitchTexts, setGlitchTexts] = useState(["", ""]);

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

    // ===== Knobs (atur feel) =====
    const TYPING_START_DELAY_MS = 1200; // overlay kosong sebentar sebelum mulai typing
    const SCRAMBLE_MS = 20;             // seberapa cepat karakter acak berganti
    const REVEAL_MS = 200;              // interval mengunci 1 huruf asli
    const REVEAL_STAGGER_MS = 220;      // tunda start typing untuk item kanan
    const CENTER_HOLD_MS = 1400;        // tahan di tengah SETELAH typing lengkap (sebelum slide)
    const SLIDE_MS = 1000;              // durasi slide kiri/kanan
    const CONTENT_DELAY_MS = 200;       // jeda setelah slide sebelum konten dimount

    // ====== Typing per karakter: scramble + reveal ======
    useEffect(() => {
      if (!isMounted || !overlayActive) return;

      const scrambleTimers = [];
      const revealTimers = [];
      const startTimers = [];

      const runTyping = (idx, text) => {
        let revealIndex = 0;
        let stopped = false;

        // loop scramble: mengganti karakter yg belum terungkap dengan ascii acak
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

        // loop reveal: kunci 1 karakter asli tiap REVEAL_MS
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

        // mulai kedua loop
        scramble();
        revealTimers[idx] = setTimeout(reveal, REVEAL_MS);
      };

      // mulai setelah delay, kanan diberi stagger kecil
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

    // ketika keduanya selesai diketik → typingComplete sekali saja
    useEffect(() => {
      if (!overlayActive) return;
      if (!typingComplete && typed[0] === texts[0] && typed[1] === texts[1]) {
        setTypingComplete(true);
      }
    }, [typed, overlayActive, typingComplete, texts]);

    // ====== GSAP FLIP: center → justify-between (edges) setelah typing selesai ======
    useLayoutEffect(() => {
      if (!isMounted || !overlayActive || !typingComplete || didRunFlip.current) return;
      if (!leftRef.current || !rightRef.current || !overlayRef.current) return;

      didRunFlip.current = true; // guard (hindari rerun di Strict Mode)

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

        // 4) Timeline: HOLD → SLIDE (barengan) → DELAY → mount content
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.to({}, { duration: CENTER_HOLD_MS / 1000 })           // tahan setelah typing lengkap
          .to(L, { x: 0, duration: SLIDE_MS / 1000 }, 0)         // slide barengan
          .to(R, { x: 0, duration: SLIDE_MS / 1000 }, 0)
          .to({}, { duration: CONTENT_DELAY_MS / 1000 })
          .add(() => setShowContent(true));
      });
    }, [isMounted, overlayActive, typingComplete]);

    // Setelah konten dimount → fade-in konten & fade-out overlay
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
            setOverlayActive(false); // baris kecil kembali ke z-index normal
          },
        },
        "-=0.2"
      );
    }, [showContent]);

    // ==== ASCII glitch BURST 0.4s (navbar hover only) ====
    const originals = { manamona: "[MANAMONA]", works: "[WORKS]", who: "[WHO]" };
    const [navTexts, setNavTexts] = useState(originals);
    const glitchIntervals = useRef({});
    const glitchTimeouts = useRef({});

    const asciiGlitch = (text, intensity = 0.45) =>
      text
        .split("")
        .map((ch) =>
          Math.random() < intensity
            ? asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)]
            : ch
        )
        .join("");

    const stopGlitch = (key) => {
      if (glitchIntervals.current[key]) {
        clearInterval(glitchIntervals.current[key]);
        delete glitchIntervals.current[key];
      }
      if (glitchTimeouts.current[key]) {
        clearTimeout(glitchTimeouts.current[key]);
        delete glitchTimeouts.current[key];
      }
      setNavTexts((p) => ({ ...p, [key]: originals[key] }));
    };

    const startGlitch = (key, durationMs = 400) => {
      if (!overlayDoneRef.current) return; // jangan glitch saat intro
      stopGlitch(key);
      glitchIntervals.current[key] = setInterval(() => {
        setNavTexts((p) => ({ ...p, [key]: asciiGlitch(originals[key]) }));
      }, 60);
      glitchTimeouts.current[key] = setTimeout(() => stopGlitch(key), durationMs);
    };

    useEffect(() => {
      return () => {
        Object.values(glitchIntervals.current).forEach(clearInterval);
        Object.values(glitchTimeouts.current).forEach(clearTimeout);
        glitchIntervals.current = {};
        glitchTimeouts.current = {};
      };
    }, []);

    // (Opsional) glitch ringan setelah overlay selesai (teks kecil kiri/kanan)
    const getRandomAscii = () =>
      asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)];

    useEffect(() => {
      if (!typingComplete) return;
      if (!overlayDoneRef.current) return;
      const iv = setInterval(() => {
        setGlitchTexts((prev) => {
          const u = [...prev];
          texts.forEach((originalText, idx) => {
            if (typed[idx] === originalText) {
              u[idx] = Array.from(originalText)
                .map((c) => (Math.random() > 0.9 ? getRandomAscii() : c))
                .join("");
            } else {
              u[idx] = typed[idx];
            }
          });
          return u;
        });
      }, 100);
      return () => clearInterval(iv);
    }, [typingComplete, typed, texts]);

    useEffect(() => {
      if (!typingComplete) return;
      if (!overlayDoneRef.current) return;
      const iv = setInterval(() => {
        setGlitchTexts((prev) => {
          const u = [...prev];
          texts.forEach((originalText, idx) => {
            if (typed[idx] === originalText) u[idx] = originalText;
          });
          return u;
        });
      }, 300);
      return () => clearInterval(iv);
    }, [typingComplete, typed, texts]);

    // ====== NAVBAR: reveal from bottom (jalan tiap kali masuk homepage) ======
    const btn1Ref = useRef(null);
    const btn2Ref = useRef(null);
    const btn3Ref = useRef(null);

    useEffect(() => {
      if (!showContent) return;

      const b1 = btn1Ref.current;
      const b2 = btn2Ref.current;
      const b3 = btn3Ref.current;
      if (!b1 || !b2 || !b3) return;

      gsap.set([b1, b2, b3], { y: 28, opacity: 0, willChange: "transform,opacity" });

      const tl = gsap.timeline({ defaults: { ease: "power4.inOut" } });
      tl.to(b1, { y: 0, opacity: 1, duration: 0.8 }, 0.00)  // 0 ms
        .to(b2, { y: 0, opacity: 1, duration: 0.8 }, 0.12)  // 120 ms
        .to(b3, { y: 0, opacity: 1, duration: 0.8 }, 0.24)  // 240 ms
        .add(() => {
          gsap.set([b1, b2, b3], { clearProps: "willChange" });
        });

      return () => tl.kill();
    }, [showContent]);

    return (
      <main className="relative h-screen w-screen overflow-hidden bg-[#f8f8f8] font-mono text-black">
        {/* OVERLAY BG ONLY (no duplicate text) */}
        <div ref={overlayRef} className="fixed inset-0 z-[9998] bg-[#f8f8f8]" />

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
              {overlayActive ? (typed[0] || "") : (glitchTexts[0] || typed[0] || texts[0])}
            </span>
            {/* 2025 (kanan) */}
            <span ref={rightRef} suppressHydrationWarning>
              {overlayActive ? (typed[1] || "") : (glitchTexts[1] || typed[1] || texts[1])}
            </span>
          </div>
        </div>

        {/* CONTENT (mounted after overlay timeline) */}
        {showContent && (
          <div ref={contentRef}>
            {/* Layer efek (tidak menghalangi klik) */}
            <div className="pointer-events-none">
              {/* Mouse trail */}
              <MouseTrail />
            </div>
              
            {/* Glow blur hijau */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
              <div className="h-[600px] w-[600px] rounded-full bg-[#D3FB43] blur-[150px] opacity-50" />
            </div>



            {/* === Canvas 3D DI DEPAN headline === */}
              <div className="absolute inset-0 z-30 pointer-events-none">
                <Canvas3D />
              </div>


              {/* Headline (di bawah Canvas3D) */}
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex flex-col items-center text-center leading-none">
                  <span className="text-[6rem] md:text-[10rem]" style={{ color: "#E7E7E7" }}>
                    TECH
                  </span>
                  <span className="text-[6rem] md:text-[10rem]" style={{ color: "#E7E7E7" }}>
                    CRAFTER
                  </span>
                </div>
              </div>

            {/* Navbar bawah */}
            <div
              className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-px"
              data-suppress-trail
            >
              {/* Bungkus tiap tombol agar bisa dianimasikan dari page.js */}
              <div ref={btn1Ref} className="inline-block">
                <ShapeButton
                  href="/"
                  label={navTexts.manamona}
                  shapeSrc="/buttons/button1.svg"
                  active={true}
                  onMouseEnter={() => startGlitch("manamona")}
                  onMouseLeave={() => stopGlitch("manamona")}
                />
              </div>
              <div ref={btn2Ref} className="inline-block">
                <ShapeButton
                  href="/work"
                  label={navTexts.works}
                  shapeSrc="/buttons/button2.svg"
                  onMouseEnter={() => startGlitch("works")}
                  onMouseLeave={() => stopGlitch("works")}
                />
              </div>
              <div ref={btn3Ref} className="inline-block">
                <ShapeButton
                  href="/about"
                  label={navTexts.who}
                  shapeSrc="/buttons/button3.svg"
                  onMouseEnter={() => startGlitch("who")}
                  onMouseLeave={() => stopGlitch("who")}
                />
              </div>
            </div>


          </div>
        )}
      </main>
    );
  }
