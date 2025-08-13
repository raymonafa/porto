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
  // Reveal params (no flag, all via event)
  pixelSize = 12,
  frames = 4,
  frameDur = 0.1,
  spill = false,
  spillPadding = 12,
  revealDelay = 0,  // ← delay per-button (ms)
}) {
  const shapeColor = active ? "#D3FB43" : "#222222";
  const textColor  = active ? "#222222" : "#D3FB43";

  // Ref ke WRAPPER (bukan link)
  const wrapRef  = useRef(null);
  const shapeRef = useRef(null);
  const labelRef = useRef(null);
  const pixelsRef = useRef(null);
  const [ready, setReady] = useState(false);

  const WIDTH = 112;
  const HEIGHT = 44;

  const rnd  = (min,max)=> Math.random()*(max-min)+min;
  const pick = (arr)=> arr[(Math.random()*arr.length)|0];

  // Siapkan grid (tanpa play) — dipanggil saat event
  const buildGrid = () => {
    // kalau sudah ada, jangan buat ulang
    if (pixelsRef.current) return;

    const host = wrapRef.current;
    if (!host) return;

    const grid = document.createElement("div");

    // area grid (spill keluar shape)
    const gw = spill ? WIDTH + spillPadding * 1 : WIDTH;
    const gh = spill ? HEIGHT + spillPadding * 1 : HEIGHT;

    Object.assign(grid.style, {
      position: "absolute",
      pointerEvents: "none",
      zIndex: "2",
      display: "grid",
      gridTemplateColumns: `repeat(${Math.ceil(gw / pixelSize)}, ${pixelSize}px)`,
      gridTemplateRows: `repeat(${Math.ceil(gh / pixelSize)}, ${pixelSize}px)`,
      left: spill ? `-${spillPadding}px` : "0",
      top:  spill ? `-${spillPadding}px` : "0",
      width: `${gw}px`,
      height:`${gh}px`,
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
    });

    const cells = [];
    const cols = Math.ceil(gw / pixelSize);
    const rows = Math.ceil(gh / pixelSize);

    const alt = active ? "#222222" : "#D3FB43";
    const palette = [shapeColor, alt, "#111111", "#f8f8f8"];

    for (let i = 0; i < rows * cols; i++) {
      const c = document.createElement("span");
      c.style.width  = `${pixelSize}px`;
      c.style.height = `${pixelSize}px`;
      c.style.background = pick(palette);
      // jitter awal
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

    // Sembunyikan shape/label sampai selesai (pakai visibility, no fade)
    if (shapeRef.current) shapeRef.current.style.visibility = "hidden";
    if (labelRef.current) labelRef.current.style.visibility = "hidden";

    setReady(true);
  };

  // Jalankan animasi glitch
  const runReveal = () => {
    const data = pixelsRef.current;
    if (!data) return;
    const { grid, cells } = data;

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

    tl.add(() => {
      if (shapeRef.current) shapeRef.current.style.visibility = "visible";
      if (labelRef.current) labelRef.current.style.visibility = "visible";
      if (grid && grid.parentNode) grid.parentNode.removeChild(grid);
      pixelsRef.current = null;
    });

    return tl;
  };

  // Listener event global + delay
  useEffect(() => {
    const handler = () => {
      buildGrid();
      window.setTimeout(() => {
        if (ready || pixelsRef.current) runReveal();
      }, revealDelay);
    };

    window.addEventListener("mm:reveal:nav", handler);
    return () => window.removeEventListener("mm:reveal:nav", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealDelay, pixelSize, spill, spillPadding, shapeSrc, active, ready]);

  return (
    <div
      ref={wrapRef}
      className={`relative block shrink-0 leading-none ${className}`}
      style={{ width: 112, height: 44 }}
    >
      <TransitionLink
        href={href}
        className="absolute inset-0 block"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        data-hover-interactive
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
    </div>
  );
}
