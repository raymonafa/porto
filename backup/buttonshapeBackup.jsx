// components/ShapeButton.jsx
"use client";
import TransitionLink from "@/components/TransitionLink";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";

export default function ShapeButton({
  href,
  label,
  shapeSrc,
  active = false,
  className = "",
  onMouseEnter,
  onMouseLeave,
  // Reveal params
  revealOnMount = true,
  pixelSize = 8,
  frames = 5,
  frameDur = 0.06,
  // Spill params
  spill = false,
  spillPadding = 16,
}) {
  const shapeColor = active ? "#D3FB43" : "#222222";
  const textColor  = active ? "#222222" : "#D3FB43";

  const rootRef   = useRef(null);
  const shapeRef  = useRef(null);
  const labelRef  = useRef(null);
  const pixelsRef = useRef(null);
  const [ready, setReady] = useState(false);

  const WIDTH = 112;
  const HEIGHT = 44;

  // ▶️ Hanya reveal saat first load di sesi ini
  const shouldReveal =
    typeof window !== "undefined" &&
    revealOnMount &&
    window.sessionStorage.getItem("mm_nav_revealed") !== "1";

  const rnd = (min, max) => Math.random() * (max - min) + min;
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  useLayoutEffect(() => {
    // Jika tidak perlu reveal (sudah pernah di sesi ini), tampilkan langsung
    if (!shouldReveal) {
      if (shapeRef.current) shapeRef.current.style.visibility = "visible";
      if (labelRef.current) labelRef.current.style.visibility = "visible";
      return;
    }

    const host = rootRef.current;
    const grid = document.createElement("div");

    const gw = spill ? WIDTH + spillPadding * 2 : WIDTH;
    const gh = spill ? HEIGHT + spillPadding * 2 : HEIGHT;

    Object.assign(grid.style, {
      position: "absolute",
      pointerEvents: "none",
      zIndex: "2",
      display: "grid",
      gridTemplateColumns: `repeat(${Math.ceil(gw / pixelSize)}, ${pixelSize}px)`,
      gridTemplateRows: `repeat(${Math.ceil(gh / pixelSize)}, ${pixelSize}px)`,
      left: spill ? `-${spillPadding}px` : "0",
      top: spill ? `-${spillPadding}px` : "0",
      width: `${gw}px`,
      height: `${gh}px`,
      ...(spill
        ? { overflow: "visible" }
        : {
            WebkitMaskImage: `url(${shapeSrc})`,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            WebkitMaskPosition: "center",
            maskImage: `url(${shapeSrc})`,
            maskRepeat: "no-repeat",
            maskSize: "100% 100%",
            maskPosition: "center",
          }),
      mixBlendMode: "normal",
    });

    const cells = [];
    const cols = Math.ceil(gw / pixelSize);
    const rows = Math.ceil(gh / pixelSize);

    const alt = active ? "#222222" : "#D3FB43";
    const palette = [shapeColor, alt, "#111111", "#f8f8f8"];

    for (let i = 0; i < rows * cols; i++) {
      const c = document.createElement("span");
      c.style.width = `${pixelSize}px`;
      c.style.height = `${pixelSize}px`;
      c.style.background = pick(palette);
      const x = rnd(-2, 2);
      const y = rnd(-2, 2);
      const s = rnd(0.9, 1.1);
      const sk = rnd(-2, 2);
      c.style.transform = `translate(${x}px, ${y}px) scale(${s}) skew(${sk}deg)`;
      grid.appendChild(c);
      cells.push(c);
    }

    host.appendChild(grid);
    pixelsRef.current = { grid, cells };

    // sembunyikan shape/label (no opacity, no blink)
    if (shapeRef.current) shapeRef.current.style.visibility = "hidden";
    if (labelRef.current) labelRef.current.style.visibility = "hidden";

    setReady(true);

    return () => {
      if (grid && grid.parentNode) grid.parentNode.removeChild(grid);
      pixelsRef.current = null;
    };
  }, [shouldReveal, shapeSrc, pixelSize, spill, spillPadding, active]);

  useEffect(() => {
    if (!shouldReveal || !ready || !pixelsRef.current) return;

    const { grid, cells } = pixelsRef.current;
    const tl = gsap.timeline({ defaults: { ease: "steps(1)" } });

    for (let f = 0; f < frames; f++) {
      tl.to(cells, {
        duration: frameDur,
        onUpdate() {
          cells.forEach((c) => {
            const x = rnd(-2.5, 2.5);
            const y = rnd(-2.5, 2.5);
            const s = rnd(0.9, 1.12);
            const sk = rnd(-3, 3);
            c.style.transform = `translate(${x}px, ${y}px) scale(${s}) skew(${sk}deg)`;
            if (Math.random() > 0.5)
              c.style.background = pick([shapeColor, "#111111", "#f8f8f8", "#D3FB43", "#222222"]);
          });
        },
        stagger: { each: 0.0007, from: "random" },
      });
    }

    // selesai: tampilin shape & label, buang grid, set session flag
    tl.add(() => {
      if (shapeRef.current) shapeRef.current.style.visibility = "visible";
      if (labelRef.current) labelRef.current.style.visibility = "visible";
      if (grid && grid.parentNode) grid.parentNode.removeChild(grid);
      pixelsRef.current = null;
      try {
        window.sessionStorage.setItem("mm_nav_revealed", "1");
      } catch {}
    });

    return () => tl.kill();
  }, [shouldReveal, ready, frames, frameDur]);

  return (
    <TransitionLink
      href={href}
      ref={rootRef}
      className={`relative block shrink-0 leading-none ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-hover-interactive
      style={{ width: 112, height: 44 }}
    >
      {/* SHAPE final (masked) */}
      <div
        ref={shapeRef}
        aria-hidden
        className="w-full h-full"
        style={{
          backgroundColor: shapeColor,
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
      {/* LABEL */}
      <span
        ref={labelRef}
        className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-sm tracking-wide"
        style={{ color: textColor }}
      >
        {label}
      </span>
    </TransitionLink>
  );
}
