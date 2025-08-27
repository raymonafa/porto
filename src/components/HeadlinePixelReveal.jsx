// src/components/HeadlinePixelReveal.jsx
"use client";

import React, { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";

/**
 * Pixel-square reveal untuk headline.svg (tanpa fade, step-by-step)
 * - Warna headline bisa diatur via prop `color`.
 * - Teknik: RECT berwarna di-mask oleh (pixel grid) ∧ (alpha headline.svg).
 */
export default function HeadlinePixelReveal({
  src = "/headlines/headline.svg",
  viewBox = { w: 1062, h: 348 },
  cols = 30,
  rows,                       // auto dari rasio jika tidak diisi
  duration = 0.8,             // total waktu (≈ tiles * eachStep)
  stagger,                    // jika undefined → dihitung dari duration/tiles
  cueCanvasAt = 0.35,         // 0..1 untuk memicu Canvas3D
  zIndexClass = "z-20",
  color = "#222222",          // ⬅️ warna headline
  invertForMask = true,       // ⬅️ true jika SVG kamu gelap di atas transparan
  onCueCanvas,
  onDone,
}) {
  const rootRef = useRef(null);
  const tilesRef = useRef([]);
  const uidRef = useRef(`mmhl_${Math.random().toString(36).slice(2)}`);

  // Hitung grid
  const R = rows ?? Math.max(6, Math.round((viewBox.h / viewBox.w) * cols));
  const tileW = viewBox.w / cols;
  const tileH = viewBox.h / R;

  // Bangun koordinat tile satu kali
  const tiles = useMemo(() => {
    const out = [];
    for (let j = 0; j < R; j++) {
      for (let i = 0; i < cols; i++) {
        out.push({ x: i * tileW, y: j * tileH, w: tileW, h: tileH });
      }
    }
    return out;
  }, [R, cols, tileW, tileH]);

  // Sinkron panjang ref dengan jumlah tile
  if (!tilesRef.current.length || tilesRef.current.length !== tiles.length) {
    tilesRef.current = new Array(tiles.length).fill(null);
  }

  useLayoutEffect(() => {
    if (!rootRef.current) return;

    const nodes = tilesRef.current.filter(Boolean);
    if (!nodes.length) return;

    // Step-time per tile
    const eachStep =
      typeof stagger === "number" && stagger > 0
        ? stagger
        : Math.max(0.001, duration / Math.max(1, nodes.length));
    const totalTime = eachStep * Math.max(0, nodes.length - 1);

    const ctx = gsap.context(() => {
      // Semua tile mask OFF (opacity 0)
      gsap.set(nodes, { opacity: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "none" }, // step-by-step, no easing
        onComplete: () => onDone && onDone(),
      });

      // Cue Canvas di tengah animasi (opsional)
      if (onCueCanvas) tl.call(onCueCanvas, [], totalTime * cueCanvasAt);

      // Nyalakan tile satu-per-satu (tanpa fade)
      tl.to(
        nodes,
        {
          opacity: 1,
          duration: 0,
          stagger: { each: eachStep, from: "random" },
        },
        0
      );
    }, rootRef);

    return () => ctx.revert();
  }, [duration, stagger, cueCanvasAt, onCueCanvas, onDone, tiles.length]);

  // Unique IDs untuk defs/mask/filter
  const ids = {
    pixel: `${uidRef.current}_pixel_mask`,
    shape: `${uidRef.current}_shape_mask`,
    invert: `${uidRef.current}_invert_filter`,
  };

  return (
    <div className={`absolute inset-0 pointer-events-none ${zIndexClass}`} ref={rootRef}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Filter invert → gambar gelap → putih (mask butuh putih = visible) */}
          {invertForMask && (
            <filter id={ids.invert} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="
                  -1  0  0  0  1
                   0 -1  0  0  1
                   0  0 -1  0  1
                   0  0  0  1  0"
              />
            </filter>
          )}

          {/* MASK bentuk headline: dari luminansi image */}
          <mask
            id={ids.shape}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={viewBox.w}
            height={viewBox.h}
          >
            <image
              href={src}
              x="0"
              y="0"
              width={viewBox.w}
              height={viewBox.h}
              preserveAspectRatio="xMidYMid meet"
              style={invertForMask ? { filter: `url(#${ids.invert})` } : undefined}
            />
          </mask>

          {/* MASK pixel grid: tile putih = terlihat */}
          <mask
            id={ids.pixel}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={viewBox.w}
            height={viewBox.h}
          >
            <rect
              x="0"
              y="0"
              width={viewBox.w}
              height={viewBox.h}
              fill="black"
              shapeRendering="crispEdges"
            />
            {tiles.map((t, i) => (
              <rect
                key={i}
                ref={(el) => (tilesRef.current[i] = el)}
                x={t.x}
                y={t.y}
                width={t.w + 0.75}   // overlap kecil agar tanpa hairline
                height={t.h + 0.75}
                fill="white"
                opacity="0"
                shapeRendering="crispEdges"
              />
            ))}
          </mask>
        </defs>

        {/* RECT berwarna → di-mask oleh (pixel ∧ shape) */}
        <g mask={`url(#${ids.pixel})`}>
          <g mask={`url(#${ids.shape})`}>
            <rect
              x="0"
              y="0"
              width={viewBox.w}
              height={viewBox.h}
              fill={color}
              shapeRendering="crispEdges"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
