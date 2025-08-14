// components/MouseTrail.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";

const asciiCharacters = ["⁕", "※", "⊙", "∘", "∀", "9", "1", ">", "-", "6"];
const gridSize = 32;
const INTERACTIVE_SELECTOR = "button, a, [data-hover-interactive], [data-suppress-trail]";

export default function MouseTrail() {
  const [trail, setTrail] = useState([]);
  const [visible, setVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // states baru untuk animasi hover
  const [isScattering, setIsScattering] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const idleTimeout = useRef(null);
  const trailRef = useRef([]);
  const isHoveringRef = useRef(false);

  // sinkron ref & trigger scatter saat mulai hover
  useEffect(() => {
    isHoveringRef.current = isHovering;

    if (isHovering && trailRef.current.length) {
      clearTimeout(idleTimeout.current);

      setIsScattering(true);
      setFadeOut(false);

      let count = 0;
      const scatter = setInterval(() => {
        setTrail((old) =>
          old.map((item) => ({
            ...item,
            char: asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)],
            x: item.x + (Math.floor(Math.random() * 3) - 1) * gridSize,
            y: item.y + (Math.floor(Math.random() * 3) - 1) * gridSize,
          }))
        );
        count++;
        if (count > 3) {
          clearInterval(scatter);
          setFadeOut(true);
          setTimeout(() => {
            setTrail([]);
            trailRef.current = [];
            setVisible(false);
            setIsScattering(false);
            setFadeOut(false);
          }, 0);
        }
      }, 80);
    }

    if (!isHovering) setFadeOut(false);
  }, [isHovering]);

  // deteksi hover elemen interaktif (navbar/buttons/dll)
  useEffect(() => {
    const over = (e) => {
      const t = e.target;
      if (t && t.closest(INTERACTIVE_SELECTOR)) setIsHovering(true);
    };
    const out = (e) => {
      const r = e.relatedTarget;
      if (!r || !r.closest(INTERACTIVE_SELECTOR)) setIsHovering(false);
    };
    window.addEventListener("mouseover", over);
    window.addEventListener("mouseout", out);
    return () => {
      window.removeEventListener("mouseover", over);
      window.removeEventListener("mouseout", out);
    };
  }, []);

  // NEW: custom event dari 3D model (hover supression)
  useEffect(() => {
    const on = () => setIsHovering(true);
    const off = () => setIsHovering(false);
    window.addEventListener("trail:suppress:on", on);
    window.addEventListener("trail:suppress:off", off);
    return () => {
      window.removeEventListener("trail:suppress:on", on);
      window.removeEventListener("trail:suppress:off", off);
    };
  }, []);

  // mouse move → spawn trail (kecuali sedang hover)
  useEffect(() => {
    const handleMove = (event) => {
      if (isHoveringRef.current) return;

      setVisible(true);
      clearTimeout(idleTimeout.current);

      const baseX = Math.round(event.clientX / gridSize) * gridSize;
      const baseY = Math.round(event.clientY / gridSize) * gridSize;
      const offsetX = (Math.floor(Math.random() * 3) - 1) * gridSize;
      const offsetY = (Math.floor(Math.random() * 3) - 1) * gridSize;

      const spot = {
        x: baseX + offsetX,
        y: baseY + offsetY,
        char: asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)],
        id: Math.random().toString(36).slice(2, 11),
        size: gridSize,
      };

      const next = [...trailRef.current, spot].slice(-80);
      trailRef.current = next;
      setTrail(next);

      // idle glitch
      idleTimeout.current = setTimeout(() => {
        let glitchCount = 0;
        const glitch = setInterval(() => {
          if (isHoveringRef.current) {
            clearInterval(glitch);
            setTrail([]);
            trailRef.current = [];
            setVisible(false);
            return;
          }
          setTrail((old) =>
            old.map((item) => ({
              ...item,
              char: asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)],
              x: item.x + (Math.floor(Math.random() * 3) - 1) * gridSize,
              y: item.y + (Math.floor(Math.random() * 3) - 1) * gridSize,
            }))
          );
          glitchCount++;
          if (glitchCount > 3) {
            clearInterval(glitch);
            setTimeout(() => {
              setTrail([]);
              trailRef.current = [];
              setVisible(false);
            }, 200);
          }
        }, 40);
      }, 900);
    };

    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      clearTimeout(idleTimeout.current);
    };
  }, []);

  if (!visible) return null;
  if (isHovering && !isScattering) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40"
      style={{ opacity: fadeOut ? 0 : 1, transition: "opacity 180ms ease-out" }}
    >
      {trail.map(({ x, y, char, id, size }) => (
        <span
          key={id}
          style={{
            position: "fixed",
            left: x,
            top: y,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: `${size}px`,
            height: `${size}px`,
            background: "black",
            color: "white",
            fontSize: `${size * 0.6}px`,
            fontFamily: "monospace",
            userSelect: "none",
            transform: "translate(-50%, -50%)",
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
