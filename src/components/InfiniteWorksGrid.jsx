"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ====== KNOBS ====== */
const COLS = 6;
const ROWS = 4;

const CELL_W = 320;   // px
const CELL_H = 320;   // px
const GAP   = 8;     // px

// ⚡️ Kecepatan & feel
const DRAG_GAIN   = 2.2;   // naikin kalau masih kurang ngebut (1.6–2.2 enak)
const WHEEL_GAIN  = 0.6;  // respons wheel/trackpad (0.35–0.6)
const MAX_V       = 12;    // clamp kecepatan inertia
const DAMPING     = 0.2;  // 0.90..0.97 (lebih besar = meluncur lebih lama)

/* palette fallback kalau item tak punya color */
const PALETTE = ["#3B82F6","#F59E0B","#10B981","#EF4444","#8B5CF6","#06B6D4","#F43F5E","#22C55E"];

/* ===== helpers ===== */
const wrapMod = (n, m) => ((n % m) + m) % m;

/* =========================================================
   GRID tak-berujung — no re-render saat drag, arah natural
   ========================================================= */
export default function InfiniteWorksGrid({ items = [] }) {
  const hostRef  = useRef(null);
  const tilesRef = useRef(null);

  const tileW = COLS * (CELL_W + GAP);
  const tileH = ROWS * (CELL_H + GAP);

  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const read = () => {
      const el = hostRef.current || window;
      const w = el === window ? window.innerWidth  : el.clientWidth;
      const h = el === window ? window.innerHeight : el.clientHeight;
      setVp({ w, h });
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  // Susun isi dasar grid (tanpa random)
  const baseCells = useMemo(() => {
    const total = COLS * ROWS;
    const n = Math.max(items.length, 1);
    return new Array(total).fill(0).map((_, i) => items[i % n]);
  }, [items]);

  // Berapa clone tile yang perlu untuk cover viewport (+ buffer)
  const tilesX = Math.max(1, Math.ceil(vp.w / tileW) + 3);
  const tilesY = Math.max(1, Math.ceil(vp.h / tileH) + 3);

  // ====== physics refs (tanpa state) ======
  const offRef = useRef({ x: 0, y: 0 }); // world offset (px)
  const velRef = useRef({ x: 0, y: 0 }); // velocity (px per frame 60hz-ish)
  const drag   = useRef({ down: false, lx: 0, ly: 0, lastT: 0 });

  // RAF: inertia + tulis CSS variables --bx/--by
  useEffect(() => {
    let raf = 0;
    const step = () => {
      raf = requestAnimationFrame(step);

      if (!drag.current.down) {
        // inertia
        velRef.current.x *= DAMPING;
        velRef.current.y *= DAMPING;
        offRef.current.x += velRef.current.x;
        offRef.current.y += velRef.current.y;
      }

      const baseX = wrapMod(offRef.current.x, tileW);
      const baseY = wrapMod(offRef.current.y, tileH);

      // arah NATURAL: var = +base (tanpa minus)
      if (tilesRef.current) {
        tilesRef.current.style.setProperty("--bx", `${baseX}px`);
        tilesRef.current.style.setProperty("--by", `${baseY}px`);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [tileW, tileH]);

  // Pointer drag: langsung geser offset, velocity cuma buat inertia sesudah lepas
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const onDown = (e) => {
      const p = e.touches ? e.touches[0] : e;
      drag.current.down = true;
      drag.current.lx = p.clientX;
      drag.current.ly = p.clientY;
      drag.current.lastT = performance.now();
      // hentikan trail saat interaksi
      window.dispatchEvent(new Event("trail:suppress:on"));
      // stop inertia saat mulai drag
      velRef.current.x = 0;
      velRef.current.y = 0;
    };

    const onMove = (e) => {
      if (!drag.current.down) return;
      const p = e.touches ? e.touches[0] : e;
      const nx = p.clientX, ny = p.clientY;
      const dx = (nx - drag.current.lx) * DRAG_GAIN;
      const dy = (ny - drag.current.ly) * DRAG_GAIN;

      drag.current.lx = nx;
      drag.current.ly = ny;

      // gerak langsung mengikuti pointer (tidak invert)
      offRef.current.x += dx;
      offRef.current.y += dy;

      // update velocity utk inertia setelah lepas
      const now = performance.now();
      const dt = Math.max(1, now - drag.current.lastT);
      drag.current.lastT = now;
      const k = 16 / dt; // normalisasi ke ~60fps
      velRef.current.x = Math.max(-MAX_V, Math.min(MAX_V, dx * k));
      velRef.current.y = Math.max(-MAX_V, Math.min(MAX_V, dy * k));
    };

    const onUp = () => {
      drag.current.down = false;
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

  // Wheel / trackpad: langsung geser offset (natural), plus sedikit inertia
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e) => {
      e.preventDefault?.();
      const dx = (e.deltaX || 0) * WHEEL_GAIN;
      const dy = (e.deltaY || 0) * WHEEL_GAIN;
      // geser langsung (tanpa invert)
      offRef.current.x += dx;
      offRef.current.y += dy;
      // tambah velocity agar terus meluncur sedikit
      velRef.current.x = Math.max(-MAX_V, Math.min(MAX_V, velRef.current.x + dx * 0.25));
      velRef.current.y = Math.max(-MAX_V, Math.min(MAX_V, velRef.current.y + dy * 0.25));
    };
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, []);

  // Koordinat clone tile (static sampai resize)
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
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ touchAction: "none", willChange: "transform" }}
    >
      {/* background grid ringan */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px, 40px 40px",
          contain: "strict",
        }}
      />

      {/* wrapper semua tile clones — posisi di-drive oleh CSS var --bx/--by */}
      <div ref={tilesRef} className="absolute inset-0" style={{ "--bx": "0px", "--by": "0px" }}>
        {tileCoords.map(({ tx, ty }) => (
          <Tile
            key={`${tx}:${ty}`}
            tx={tx}
            ty={ty}
            items={baseCells}
            tileW={tileW}
            tileH={tileH}
          />
        ))}
      </div>
    </div>
  );
}

/* ================= TILE ================= */
function Tile({ tx, ty, items, tileW, tileH }) {
  return (
    <div
      className="absolute"
      style={{
        transform: `translate3d(calc(var(--bx) + ${tx * tileW}px), calc(var(--by) + ${ty * tileH}px), 0)`,
        width: tileW,
        height: tileH,
        willChange: "transform",
        contain: "layout paint",
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

/* ============== CELL (layout mock) ============== */
function WorkCell({ left, top, item, fallbackColor }) {
  const onEnter = () => window.dispatchEvent(new Event("trail:suppress:on"));
  const onLeave = () => window.dispatchEvent(new Event("trail:suppress:off"));

  const color = item?.color || fallbackColor;
  const year  = item?.year || "2025";
  const tag   = item?.tag  || "UI/UX";

  return (
    <div
      className="absolute rounded-lg overflow-hidden border border-white/10"
      style={{
        left, top, width: CELL_W, height: CELL_H,
        backgroundColor: color,
        willChange: "transform",
        contain: "layout paint",
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <Link href={item?.href ?? "#"} className="group block h-full" draggable={false}>
        <div className="pointer-events-none absolute inset-0 p-4">
          <div className="absolute left-4 top-4 text-sm font-semibold tracking-wide text-black/85 mix-blend-multiply">
            LOGO
          </div>
          <div className="absolute right-4 top-4 text-sm font-mono tracking-wide bg-black/55 text-white px-2 py-1 rounded">
            {item?.title ?? "PROJECT NAME"}
          </div>
          <div className="absolute inset-0 grid place-items-center">
            <div className="uppercase tracking-widest font-mono text-xl md:text-2xl text-black/25 mix-blend-multiply">
              BACKGROUND IMAGE
            </div>
          </div>
          <div className="absolute left-4 bottom-4">
            <span className="inline-block rounded px-2 py-1 text-xs font-mono bg-black/35 text-white">
              [{year}]
            </span>
          </div>
          <div className="absolute right-4 bottom-4 text-sm font-semibold tracking-wide text-black/85 mix-blend-multiply">
            {tag}
          </div>
        </div>
        <div className="absolute inset-0 rounded-lg ring-0 ring-white/0 group-hover:ring-2 group-hover:ring-white/50 transition-all" />
      </Link>
    </div>
  );
}
