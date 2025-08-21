// src/components/InfiniteWorksGrid.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";

/* ================== GRID & MOTION KNOBS ================== */
const COLS = 6;
const ROWS = 3;

const CELL_W = 320;
const CELL_H = 320;
const GAP    = 0;

// Drag & inertia (arah natural)
const DRAG_GAIN  = 1.2;
const WHEEL_GAIN = 0.35;
const MAX_V      = 12;
const DAMPING    = 0.95;
const FOLLOW     = 0.16;

// Parallax mouse
const MOUSE_GAIN   = 18;
const MOUSE_SMOOTH = 0.08;

// Bedakan klik vs drag (px)
const CLICK_DRAG_EPS = 7;

/* ====== SIMPLE REVEAL (scale+opacity) ====== */
const REVEAL_MIN_DELAY = 0.0;
const REVEAL_MAX_DELAY = 0.35;
const REVEAL_DUR       = 0.6;

/* ==== THEME ==== */
const TILE_BG   = "#E7E7E7";
const GRID_LINE = "#B3B3B3";
const HOVER_TINT = "rgba(0,0,0,0.06)";

/* ==== CAMERA FX ==== */
const CAM_PERSPECTIVE = 1200;
const CAM_SMOOTH      = 0.08;
const CAM_ZOOM_MAX    = 0.08;
const CAM_TILT_MAX    = 3.2;

const wrapMod = (n, m) => ((n % m) + m) % m;

export default function InfiniteWorksGrid({ items = [] }) {
  const hostRef   = useRef(null);
  const camRef    = useRef(null);
  const tilesRef  = useRef(null);
  const revealedOnce = useRef(false);

  const tileW = COLS * (CELL_W + GAP);
  const tileH = ROWS * (CELL_H + GAP);

  /* === Gate: tunggu PixelTransition selesai === */
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const onRevealDone = () => setArmed(true);
    window.addEventListener("app:transition:reveal:done", onRevealDone, { once: true });
    return () => window.removeEventListener("app:transition:reveal:done", onRevealDone);
  }, []);

  // viewport
  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const read = () => {
      const el = hostRef.current || window;
      const w = el === window ? window.innerWidth  : el.clientWidth;
      const h = el === window ? window.innerHeight : el.clientHeight;
      setVp({ w, h });
    };
    read();
    window.addEventListener("resize", read, { passive: true });
    return () => window.removeEventListener("resize", read);
  }, []);

  // isi grid
  const baseCells = useMemo(() => {
    const total = COLS * ROWS;
    const n = Math.max(items.length, 1);
    return new Array(total).fill(0).map((_, i) => items[i % n]);
  }, [items]);

  // jumlah clone tile
  const tilesX = Math.max(1, Math.ceil(vp.w / tileW) + 3);
  const tilesY = Math.max(1, Math.ceil(vp.h / tileH) + 3);

  // ===== physics (no state re-render) =====
  const off    = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const vel    = useRef({ x: 0, y: 0 });
  const drag   = useRef({ down: false, lx: 0, ly: 0, lastT: 0, dist: 0 });

  // Parallax mouse
  const cursor = useRef({ x: 0, y: 0 });
  const mshift = useRef({ x: 0, y: 0 });

  // Kamera semu
  const cam    = useRef({ scale: 1, rx: 0, ry: 0 });

  // RAF loop
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);

      if (drag.current.down) {
        off.current.x += (target.current.x - off.current.x) * FOLLOW;
        off.current.y += (target.current.y - off.current.y) * FOLLOW;
      } else {
        target.current.x += vel.current.x;
        target.current.y += vel.current.y;
        vel.current.x *= DAMPING;
        vel.current.y *= DAMPING;
        off.current.x += (target.current.x - off.current.x) * FOLLOW;
        off.current.y += (target.current.y - off.current.y) * FOLLOW;
      }

      // parallax
      const px = cursor.current.x * MOUSE_GAIN;
      const py = cursor.current.y * MOUSE_GAIN;
      mshift.current.x += (px - mshift.current.x) * MOUSE_SMOOTH;
      mshift.current.y += (py - mshift.current.y) * MOUSE_SMOOTH;

      const baseX = wrapMod(off.current.x, tileW);
      const baseY = wrapMod(off.current.y, tileH);

      if (tilesRef.current) {
        tilesRef.current.style.setProperty("--bx", `${baseX}px`);
        tilesRef.current.style.setProperty("--by", `${baseY}px`);
        tilesRef.current.style.setProperty("--mx", `${mshift.current.x}px`);
        tilesRef.current.style.setProperty("--my", `${mshift.current.y}px`);
      }

      // camera fx
      const speed = Math.min(1, Math.hypot(vel.current.x, vel.current.y) / MAX_V);
      const targetScale = 1 - speed * CAM_ZOOM_MAX;
      cam.current.scale += (targetScale - cam.current.scale) * CAM_SMOOTH;

      const tRy = (-vel.current.x / MAX_V) * CAM_TILT_MAX;
      const tRx = ( vel.current.y / MAX_V) * CAM_TILT_MAX;
      cam.current.ry += (tRy - cam.current.ry) * CAM_SMOOTH;
      cam.current.rx += (tRx - cam.current.rx) * CAM_SMOOTH;

      if (camRef.current) {
        const { scale, rx, ry } = cam.current;
        camRef.current.style.transform =
          `perspective(${CAM_PERSPECTIVE}px) translateZ(0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tileW, tileH]);

  // Pointer drag + parallax
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const onDown = (e) => {
      const p = e.touches ? e.touches[0] : e;
      drag.current.down = true;
      drag.current.lx = p.clientX;
      drag.current.ly = p.clientY;
      drag.current.lastT = performance.now();
      drag.current.dist = 0; // reset threshold
      vel.current.x = 0;
      vel.current.y = 0;
    };

    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      cursor.current.x = (clientX / window.innerWidth  - 0.5) * 2;
      cursor.current.y = (clientY / window.innerHeight - 0.5) * -2;

      if (!drag.current.down) return;
      const nx = clientX, ny = clientY;
      const dx = (nx - drag.current.lx) * DRAG_GAIN;
      const dy = (ny - drag.current.ly) * DRAG_GAIN;

      drag.current.lx = nx;
      drag.current.ly = ny;

      drag.current.dist += Math.hypot(dx, dy);

      target.current.x += dx;
      target.current.y += dy;

      const now = performance.now();
      const dt = Math.max(1, now - drag.current.lastT);
      drag.current.lastT = now;
      const k = 16 / dt;
      vel.current.x = Math.max(-MAX_V, Math.min(MAX_V, dx * k));
      vel.current.y = Math.max(-MAX_V, Math.min(MAX_V, dy * k));
    };

    const onUp = () => {
      drag.current.down = false;
      drag.current.dist = 0; // ⬅️ penting: bersihkan agar klik berikutnya tidak keblok
    };

    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);

    host.addEventListener("touchstart", onDown, { passive: true });
    host.addEventListener("touchmove", onMove, { passive: false });
    host.addEventListener("touchend", onUp);
    host.addEventListener("touchcancel", onUp);

    // ⬇️ jaga-jaga: kalau mouse dilepas di luar window/tab pindah
    window.addEventListener("pointerup", onUp);
    window.addEventListener("blur", onUp);

    return () => {
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("touchstart", onDown);
      host.removeEventListener("touchmove", onMove);
      host.removeEventListener("touchend", onUp);
      host.removeEventListener("touchcancel", onUp);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("blur", onUp);
    };
  }, []);

  // Wheel / trackpad
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e) => {
      const dx = (e.deltaX || 0) * WHEEL_GAIN;
      const dy = (e.deltaY || 0) * WHEEL_GAIN;
      target.current.x += dx;
      target.current.y += dy;
      vel.current.x = Math.max(-MAX_V, Math.min(MAX_V, vel.current.x + dx * 0.25));
      vel.current.y = Math.max(-MAX_V, Math.min(MAX_V, vel.current.y + dy * 0.25));
    };
    host.addEventListener("wheel", onWheel, { passive: true });
    return () => host.removeEventListener("wheel", onWheel);
  }, []);

  // Koordinat clone tile
  const tileCoords = useMemo(
    () =>
      Array.from({ length: tilesY + 2 }, (_, j) => j - 1).flatMap((ty) =>
        Array.from({ length: tilesX + 2 }, (_, i) => ({ tx: i - 1, ty }))
      ),
    [tilesX, tilesY]
  );

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
      style={{
        visibility: armed ? "visible" : "hidden",
        touchAction: "none",
        overscrollBehavior: "none",
        willChange: "transform",
        background: "#E7E7E7",
        zIndex: 10,
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* camera wrapper: semua grid berada di dalam ini */}
      <div
        ref={camRef}
        className="absolute inset-0"
        style={{
          willChange: "transform",
          transform: `perspective(${CAM_PERSPECTIVE}px) translateZ(0)`,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
        }}
      >
        <div
          ref={tilesRef}
          className="absolute inset-0"
          style={{ "--bx": "0px", "--by": "0px", "--mx": "0px", "--my": "0px" }}
        >
          {tileCoords.map(({ tx, ty }) => (
            <Tile
              key={`${tx}:${ty}`}
              tx={tx}
              ty={ty}
              items={baseCells}
              tileW={tileW}
              tileH={tileH}
              doReveal={armed && !revealedOnce.current && tx === 0 && ty === 0}
              onRevealed={() => { revealedOnce.current = true; }}
              dragStateRef={drag}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= TILE ================= */
function Tile({ tx, ty, items, tileW, tileH, doReveal, onRevealed, dragStateRef }) {
  return (
    <div
      className="absolute"
      style={{
        transform: `translate3d(calc(var(--bx) + var(--mx) + ${tx * tileW}px), calc(var(--by) + var(--my) + ${ty * tileH}px), 0)`,
        width: tileW,
        height: tileH,
        willChange: "transform",
        contain: "layout paint",
      }}
    >
      {/* Grid lines 1px */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(to right, ${GRID_LINE} 1px, transparent 1px),
            linear-gradient(to bottom, ${GRID_LINE} 1px, transparent 1px)
          `,
          backgroundSize: `${CELL_W}px ${CELL_H}px, ${CELL_W}px ${CELL_H}px`,
          backgroundPosition: "0 0, 0 0",
          zIndex: 0,
        }}
      />

      <div className="relative w-full h-full" style={{ zIndex: 2 }}>
        {items.map((it, i) => {
          const cx = i % COLS;
          const cy = (i / COLS) | 0;
          const left = cx * (CELL_W + GAP);
          const top  = cy * (CELL_H + GAP);
          return (
            <WorkCell
              key={i}
              left={left}
              top={top}
              item={it}
              reveal={doReveal}
              delay={REVEAL_MIN_DELAY + Math.random() * (REVEAL_MAX_DELAY - REVEAL_MIN_DELAY)}
              onCellRevealed={onRevealed}
              dragStateRef={dragStateRef}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ============== CELL (reveal + hover + click-safe) ============== */
function WorkCell({ left, top, item, reveal, delay = 0, onCellRevealed, dragStateRef }) {
  const cellRef = useRef(null);
  const contentRef = useRef(null);
  const revealedRef = useRef(false);

  const year  = item?.year || "2025";
  const tag   = item?.tag  || "UI/UX";

  useEffect(() => {
    const el = cellRef.current;
    if (!el) return;

    // state awal
    el.style.opacity = reveal ? "0" : "1";
    el.style.transform = reveal ? "scale(0.94)" : "scale(1)";
    el.style.transformOrigin = "center center";

    if (!reveal || revealedRef.current) return;

    const tl = gsap.timeline({
      delay,
      defaults: { ease: "power4.inOut" },
      onComplete: () => {
        revealedRef.current = true;
        onCellRevealed?.();
      },
    });

    tl.to(el, { opacity: 1, scale: 1, duration: REVEAL_DUR });

    return () => tl.kill();
  }, [reveal, delay, onCellRevealed]);

  return (
    <div
      ref={cellRef}
      className="absolute js-cell"
      style={{
        left, top, width: CELL_W, height: CELL_H,
        backgroundColor: TILE_BG,
        willChange: "transform, opacity",
        contain: "layout paint",
        zIndex: 0,
      }}
    >
      <Link
        href={item?.href ?? "#"}
        className="group block h-full cursor-pointer"  // ⬅️ paksa cursor pointer meski parent cursor-grab
        draggable={false}
        data-interactive
        style={{ position: "relative", zIndex: 2, pointerEvents: "auto" }}
        onDragStart={(e) => e.preventDefault()}
        onClick={(e) => {
          const dist = dragStateRef?.current?.dist ?? 0;
          if (dist > CLICK_DRAG_EPS) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {/* BACKGROUND IMAGE */}
        {item?.bg && (
          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              backgroundImage: `url(${item.bg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              zIndex: 0,
            }}
          />
        )}

        {/* HOVER TINT */}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-200 ease-out pointer-events-none group-hover:opacity-100"
          aria-hidden
          style={{ background: HOVER_TINT, zIndex: 1 }}
        />

        {/* overlay UI */}
        <div
          ref={contentRef}
          className="pointer-events-none absolute inset-0 p-4 select-none"
          style={{ opacity: 1, zIndex: 2 }}
        >
          <div className="absolute left-4 top-4 text-sm font-semibold tracking-wide text-[#222]">
            LOGO
          </div>
          <div className="absolute right-4 top-4 text-sm font-mono tracking-wide bg-[#222] text-white px-2 py-1 rounded">
            {item?.title ?? "PROJECT NAME"}
          </div>
          <div className="absolute left-4 bottom-4">
            <span className="inline-block rounded px-2 py-1 text-xs font-mono bg-[#444] text-white">
              [{year}]
            </span>
          </div>
          <div className="absolute right-4 bottom-4 text-sm font-semibold tracking-wide text-[#222]">
            {tag}
          </div>
        </div>
      </Link>
    </div>
  );
}
