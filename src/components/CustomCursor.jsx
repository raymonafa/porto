// src/components/CustomCursor.jsx
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom cursor (SVG) dengan state:
 * - default  : icon default.svg
 * - hover    : icon hover.svg (saat di elemen [data-hover-interactive] / [data-interactive] / <a> / <button>)
 * - drag     : icon drag.svg (opsional) saat pointer down / event custom
 *
 * Cara pakai:
 *   <CustomCursor />
 * Pastikan: body/main punya class "cursor-none" di halaman yang ingin pakai cursor kustom.
 */
export default function CustomCursor({
  size = 32,
  zIndex = 13000,
  defaultSrc = "/cursors/default.svg",
  hoverSrc   = "/cursors/hover.svg",
  dragSrc    = "/cursors/drag.svg", // opsional; kalau tidak ada, akan fallback ke hover/default
  selectors = [
    "[data-hover-interactive]",
    "[data-interactive]",
    "a",
    "button",
    '[role="button"]',
    'input[type="submit"]',
    'input[type="button"]',
    'label',
  ],
}) {
  const wrapRef = useRef(null);
  const pos = useRef({ x: 0, y: 0 });
  const cur = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);

  const [enabled, setEnabled] = useState(true);
  const [visible, setVisible] = useState(true);
  const [hover, setHover]     = useState(false);
  const [drag, setDrag]       = useState(false);

  // Nonaktifkan di perangkat touch
  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (coarse) setEnabled(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = wrapRef.current;
    const selectorString = selectors.join(",");

    const lerp = (a, b, t) => a + (b - a) * t;

    const onMove = (e) => {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
      setVisible(true);
    };
    const onEnter = () => setVisible(true);
    const onLeave = () => setVisible(false);

    // Delegasi hover untuk elemen interaktif DOM
    const onOver = (e) => {
      const t = e.target;
      setHover(!!t?.closest?.(selectorString));
    };
    const onOut = (e) => {
      const nxt = e.relatedTarget;
      if (!nxt || !nxt.closest || !nxt.closest(selectorString)) {
        setHover(false);
      }
    };

    // Drag state dari pointer
    const onDown = () => setDrag(true);
    const onUp   = () => setDrag(false);

    // Event kustom dari r3f/grid
    const onCustomHover = (e) => setHover(!!(e.detail));
    const onCustomDrag  = (e) => setDrag(!!(e.detail));

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseenter", onEnter);
    window.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("cursor:hover", onCustomHover);
    window.addEventListener("cursor:drag", onCustomDrag);

    // Smooth follow
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      cur.current.x = lerp(cur.current.x, pos.current.x, 0.25);
      cur.current.y = lerp(cur.current.y, pos.current.y, 0.25);
      if (el) {
        el.style.transform = `translate3d(${cur.current.x - size / 2}px, ${cur.current.y - size / 2}px, 0) scale(${drag ? 0.88 : 1})`;
        el.style.opacity = visible ? "1" : "0";
      }
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("cursor:hover", onCustomHover);
      window.removeEventListener("cursor:drag", onCustomDrag);
    };
  }, [enabled, selectors, size, visible]);

  if (!enabled) return null;

  const src = drag && dragSrc ? dragSrc : (hover ? hoverSrc : defaultSrc);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: size,
        height: size,
        pointerEvents: "none",
        zIndex,
        transition: "opacity 120ms ease-out",
        willChange: "transform,opacity",
      }}
    >
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        draggable={false}
        style={{ display: "block" }}
      />
    </div>
  );
}
