// src/components/InfiniteWorksGrid.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ====== KNOBS ====== */
const COLS = 5;
const ROWS = 3;

const CELL_W = 360;   // px
const CELL_H = 360;   // px
const GAP   = 16;     // px

const DRAG_DAMPING = 0.9;
const WHEEL_SPEED  = 0.9;
const MAX_V        = 4.5;

// palette fallback jika item tidak punya color
const PALETTE = ["#3B82F6","#F59E0B","#10B981","#EF4444","#8B5CF6","#06B6D4","#F43F5E","#22C55E"];

/* ===== helpers ===== */
const wrapMod = (n, m) => ((n % m) + m) % m;

/* ==================== GRID ==================== */
export default function InfiniteWorksGrid({ items = [] }) {
  // Tile size HARUS meliputi gap agar kloningan tile tetap punya celah antar sel
  const tileW = COLS * (CELL_W + GAP);
  const tileH = ROWS * (CELL_H + GAP);

  const hostRef = useRef(null);

  // world offset (drag / wheel)
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const vRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ down: false, lx: 0, ly: 0, lastT: 0 });

  // viewport size (untuk jumlah tile dinamis)
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);
  useEffect(() => {
    const read = () => {
      const el = hostRef.current || window;
      const w = el === window ? window.innerWidth  : el.clientWidth;
      const h = el === window ? window.innerHeight : el.clientHeight;
      setVw(w); setVh(h);
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  // RAF inertia
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!dragRef.current.down) {
        const v = vRef.current;
        if (Math.abs(v.x) > 0.001 || Math.abs(v.y) > 0.001) {
          v.x *= DRAG_DAMPING;
          v.y *= DRAG_DAMPING;
          setOffset((o) => ({ x: o.x + v.x, y: o.y + v.y }));
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Pointer listeners di container
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const onDown = (e) => {
      const p = e.touches ? e.touches[0] : e;
      dragRef.current.down = true;
      dragRef.current.lx = p.clientX;
      dragRef.current.ly = p.clientY;
      dragRef.current.lastT = performance.now();
      vRef.current.x = vRef.current.y = 0;
      window.dispatchEvent(new Event("trail:suppress:on"));
    };
    const onMove = (e) => {
      if (!dragRef.current.down) return;
      const p = e.touches ? e.touches[0] : e;
      const nx = p.clientX, ny = p.clientY;
      const dx = nx - dragRef.current.lx;
      const dy = ny - dragRef.current.ly;
      dragRef.current.lx = nx; dragRef.current.ly = ny;

      const now = performance.now();
      const dt = Math.max(1, now - dragRef.current.lastT);
      dragRef.current.lastT = now;

      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
      vRef.current.x = Math.max(-MAX_V, Math.min(MAX_V, dx * (16 / dt)));
      vRef.current.y = Math.max(-MAX_V, Math.min(MAX_V, dy * (16 / dt)));
    };
    const onUp = () => {
      dragRef.current.down = false;
      window.dispatchEvent(new Event("trail:suppress:off"));
    };

    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);

    host.addEventListener("touchstart", onDown, { passive: true });
    host.addEventListener("touchmove", onMove, { passive: false });
    host.addEventListener("touchend", onUp);
    host.addEventListener("touchcancel", onUp);

    return () => {
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("touchstart", onDown);
      host.removeEventListener("touchmove", onMove);
      host.removeEventListener("touchend", onUp);
      host.removeEventListener("touchcancel", onUp);
    };
  }, []);

  // Wheel / trackpad
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e) => {
      e.preventDefault?.();
      const dx = (e.deltaX || 0) * WHEEL_SPEED;
      const dy = (e.deltaY || 0) * WHEEL_SPEED;
      setOffset((o) => ({ x: o.x - dx, y: o.y - dy }));
      vRef.current.x = Math.max(-MAX_V, Math.min(MAX_V, -dx * 0.1));
      vRef.current.y = Math.max(-MAX_V, Math.min(MAX_V, -dy * 0.1));
    };
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, []);

  // base offset dibungkus ke [0..tile)
  const baseX = useMemo(() => wrapMod(offset.x, tileW), [offset.x, tileW]);
  const baseY = useMemo(() => wrapMod(offset.y, tileH), [offset.y, tileH]);

  // Hitung jumlah tile yang dibutuhkan agar selalu cover + buffer
  const tilesX = Math.max(1, Math.ceil(vw / tileW) + 3);
  const tilesY = Math.max(1, Math.ceil(vh / tileH) + 3);

  // data cell dasar (COLS*ROWS) → isi list works berulang (tanpa shuffle)
  const baseCells = useMemo(() => {
    const total = COLS * ROWS;
    const n = Math.max(items.length, 1);
    return new Array(total).fill(0).map((_, i) => items[i % n]);
  }, [items]);

  return (
    <div ref={hostRef} className="absolute inset-0 cursor-grab active:cursor-grabbing">
      {/* background grid halus */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px, 40px 40px",
        }}
      />

      {/* clones: dari -1 sampai N (buffer extra) */}
      <div className="absolute inset-0">
        {Array.from({ length: tilesY + 2 }, (_, j) => j - 1).map((ty) =>
          Array.from({ length: tilesX + 2 }, (_, i) => i - 1).map((tx) => {
            const x = -baseX + tx * tileW;
            const y = -baseY + ty * tileH;
            return <Tile key={`${tx}:${ty}`} x={x} y={y} items={baseCells} />;
          })
        )}
      </div>
    </div>
  );
}

/* =============== Tile & Cell =============== */
function Tile({ x, y, items }) {
  const TILE_W = COLS * (CELL_W + GAP);
  const TILE_H = ROWS * (CELL_H + GAP);

  return (
    <div
      className="absolute"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        willChange: "transform",
        width: TILE_W,
        height: TILE_H,
      }}
    >
      <div className="relative w-full h-full">
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
              fallbackColor={PALETTE[i % PALETTE.length]}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ====== Tile UI (sesuai mock) ====== */
function WorkCell({ left, top, item, fallbackColor }) {
  const onEnter = () => window.dispatchEvent(new Event("trail:suppress:on"));
  const onLeave = () => window.dispatchEvent(new Event("trail:suppress:off"));

  const color = item?.color || fallbackColor;
  const year  = item?.year || "2025";
  const tag   = item?.tag  || "UI/UX";

  return (
    <div
      className="absolute rounded-lg overflow-hidden border border-white/10 bg-black/10"
      style={{ left, top, width: CELL_W, height: CELL_H, backgroundColor: color }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <Link href={item?.href ?? "#"} className="group block h-full" draggable={false}>
        {/* Corner content */}
        <div className="pointer-events-none absolute inset-0 p-4">
          {/* TL: LOGO (placeholder) */}
          <div className="absolute left-4 top-4 text-sm font-semibold tracking-wide text-black/85 mix-blend-multiply">
            LOGO
          </div>

          {/* TR: Project Name */}
          <div className="absolute right-4 top-4 text-sm font-mono tracking-wide bg-black/55 text-white px-2 py-1 rounded">
            {item?.title ?? "PROJECT NAME"}
          </div>

          {/* CENTER: BACKGROUND IMAGE (placeholder text) */}
          <div className="absolute inset-0 grid place-items-center">
            <div className="uppercase tracking-widest font-mono text-xl md:text-2xl text-black/25 mix-blend-multiply">
              BACKGROUND IMAGE
            </div>
          </div>

          {/* BL: [YEAR] */}
          <div className="absolute left-4 bottom-4">
            <span className="inline-block rounded px-2 py-1 text-xs font-mono bg-black/35 text-white">
              [{year}]
            </span>
          </div>

          {/* BR: Tag */}
          <div className="absolute right-4 bottom-4 text-sm font-semibold tracking-wide text-black/85 mix-blend-multiply">
            {tag}
          </div>
        </div>

        {/* Hover outline halus */}
        <div className="absolute inset-0 rounded-lg ring-0 ring-white/0 group-hover:ring-2 group-hover:ring-white/50 transition-all" />
      </Link>
    </div>
  );
}
