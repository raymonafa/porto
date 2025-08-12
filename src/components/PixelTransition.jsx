"use client";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import gsap from "gsap";

const PixelTransition = forwardRef(({ pixelSize = 80, coverDuration = 0.05, revealDuration = 0.1 }, ref) => {
  const overlayRef = useRef(null);
  const [rows, setRows] = useState(0);
  const [cols, setCols] = useState(0);

  useEffect(() => {
    const r = Math.ceil(window.innerHeight / pixelSize);
    const c = Math.ceil(window.innerWidth / pixelSize);
    setRows(r); setCols(c);
  }, [pixelSize]);

  useEffect(() => {
    if (!rows || !cols || !overlayRef.current) return;
    const overlay = overlayRef.current;
    overlay.innerHTML = "";
    const total = rows * cols;
    for (let i = 0; i < total; i++) {
      const d = document.createElement("div");
      d.className = "pixel";
      overlay.appendChild(d);
    }
  }, [rows, cols]);

  useImperativeHandle(ref, () => ({
    play(onCovered) {
      return new Promise((resolve) => {
        const overlay = overlayRef.current;
        const pixels = overlay.querySelectorAll(".pixel");

        overlay.style.display = "grid";
        overlay.style.pointerEvents = "auto";

        gsap.set(pixels, { backgroundColor: "transparent" });

        gsap.to(pixels, {
          backgroundColor: "#D3FB43",
          duration: coverDuration,
          ease: "none",
          stagger: { each: 0.005, from: "random" },
          onComplete() {
            onCovered?.();
            setTimeout(() => {
              gsap.to(pixels, {
                backgroundColor: "transparent",
                duration: revealDuration,
                ease: "none",
                stagger: { each: 0.005, from: "random" },
                onComplete() {
                  overlay.style.display = "none";
                  overlay.style.pointerEvents = "none";
                  resolve();
                },
              });
            }, 40);
          },
        });
      });
    },
  }));

  return (
    <>
      {/* Background grid halus (opsional) */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
          backgroundImage: `
            linear-gradient(to right, rgba(3,3,3,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(3,3,3,0.05) 1px, transparent 1px)
          `,
          backgroundSize: `${pixelSize}px ${pixelSize}px`,
          backgroundRepeat: "repeat",
        }}
      />
      {/* Overlay pixel */}
      <div
        ref={overlayRef}
        data-suppress-trail // <-- supaya MouseTrail kamu auto mati saat transisi
        style={{
          position: "fixed", inset: 0, zIndex: 9999, display: "none",
          gridTemplateRows: `repeat(${rows}, ${pixelSize}px)`,
          gridTemplateColumns: `repeat(${cols}, ${pixelSize}px)`,
          pointerEvents: "none",
        }}
      />
    </>
  );
});
PixelTransition.displayName = "PixelTransition";
export default PixelTransition;
