// src/app/page.js
"use client";

import Canvas3D from "@/components/Canvas3D";
import MouseTrail from "@/components/MouseTrail";
import CenterCube from "@/components/CenterCube";
import ShapeButton from "@/components/ShapeButton";
import React, { useEffect, useRef, useState } from "react";

const asciiCharacters = ["⁕", "※", "⊙", "∘", "∀", "9", "1", ">", "-", "6"];

export default function Home() {
  const texts = ["MANAMONA", "INDONESIA", "2025"];
  const [typed, setTyped] = useState(["", "", ""]);
  const [typingComplete, setTypingComplete] = useState(false);
  const [glitchTexts, setGlitchTexts] = useState(["", "", ""]);

  // ==== ASCII glitch BURST 0.4s (navbar) ====
  const originals = { manamona: "MANAMONA", works: "WORKS", who: "WHO" };
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
  // ==== end ====

  const getRandomAscii = () =>
    asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)];

  useEffect(() => {
    texts.forEach((text, idx) => {
      let i = 0;
      const typeInterval = setInterval(() => {
        setTyped((prev) => {
          const u = [...prev];
          if (i < text.length) {
            u[idx] = Array.from(text.slice(0, i + 1))
              .map(() => asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)])
              .join("");
          } else {
            u[idx] = text;
          }
          return u;
        });
        i++;
        if (i > text.length) clearInterval(typeInterval);
      }, 100 + idx * 50);
    });

    const maxTyping = Math.max(
      ...texts.map((text, idx) => (text.length + 1) * (100 + idx * 50))
    );
    const t = setTimeout(() => setTypingComplete(true), maxTyping);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!typingComplete) return;
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
  }, [typingComplete, typed]);

  useEffect(() => {
    if (!typingComplete) return;
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
  }, [typingComplete, typed]);

  // 🔔 Orchestrate pixel-reveal untuk tombol (sekali saat page mount)
  useEffect(() => {
    const id = setTimeout(() => {
      window.dispatchEvent(new Event("mm:reveal:nav"));
    }, 50);
    return () => clearTimeout(id);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#f8f8f8] font-mono text-black">
      {/* Layer efek (tidak menghalangi klik) */}
      <div className="pointer-events-none">
        <CenterCube />
        <MouseTrail />
      </div>

      {/* Glow blur hijau */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <div className="h-[600px] w-[600px] rounded-full bg-[#D3FB43] blur-[150px] opacity-50" />
      </div>

      {/* Headline */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="flex flex-col items-center text-center leading-none">
          <span className="text-[6rem] text-neutral-700 md:text-[10rem]">TECH</span>
          <span className="text-[6rem] text-neutral-700 md:text-[10rem]">CRAFTER</span>
        </div>
      </div>

      {/* Teks kecil kiri & kanan */}
      <div className="pointer-events-none absolute left-0 top-1/2 z-20 w-full px-10 text-sm text-black">
        <div className="flex justify-between">
          <span>{glitchTexts[0] || typed[0]}</span>
          <span>{glitchTexts[2] || typed[2]}</span>
        </div>
      </div>

      {/* Navbar bawah (shape SVG + ASCII burst + pixel reveal stagger) */}
      <div
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-px"
        data-suppress-trail
      >
        <ShapeButton
          href="/"
          label={navTexts.manamona}
          shapeSrc="/buttons/button1.svg"
          active={true}
          spill
          spillPadding={12}
          revealDelay={0}          // mulai duluan
          onMouseEnter={() => startGlitch("manamona")}
          onMouseLeave={() => stopGlitch("manamona")}
        />
        <ShapeButton
          href="/work"
          label={navTexts.works}
          shapeSrc="/buttons/button2.svg"
          spill
          spillPadding={12}
          revealDelay={140}        // menyusul
          onMouseEnter={() => startGlitch("works")}
          onMouseLeave={() => stopGlitch("works")}
        />
        <ShapeButton
          href="/about"
          label={navTexts.who}
          shapeSrc="/buttons/button3.svg"
          spill
          spillPadding={12}
          revealDelay={280}        // terakhir
          onMouseEnter={() => startGlitch("who")}
          onMouseLeave={() => stopGlitch("who")}
        />
      </div>

      {/* Canvas 3D di layer bawah */}
      <div className="relative z-0">
        <Canvas3D />
      </div>
    </main>
  );
}
