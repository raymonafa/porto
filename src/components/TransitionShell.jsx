// src/components/TransitionShell.jsx
"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PixelTransition from "@/components/PixelTransition";

export default function TransitionShell({ children }) {
  const router = useRouter();
  const pixelRef = useRef(null);
  const busyRef = useRef(false); // cegah double-click/rapid click

  useEffect(() => {
    const handler = (e) => {
      const href = e?.detail?.href;
      if (!href || busyRef.current) return;
      busyRef.current = true;

      const play = pixelRef.current?.play;

      // Kalau komponen transisi siap → mainkan, lalu push
      if (typeof play === "function") {
        try {
          play(() => {
            router.push(href);
            // setelah push, biarkan PixelTransition handle reveal-nya sendiri
            setTimeout(() => (busyRef.current = false), 0);
          });
        } catch {
          // kalau ada error saat play → fallback
          router.push(href);
          setTimeout(() => (busyRef.current = false), 0);
        }
      } else {
        // Fallback: langsung navigate
        router.push(href);
        setTimeout(() => (busyRef.current = false), 0);
      }
    };

    window.addEventListener("app:transition:navigate", handler);
    return () => window.removeEventListener("app:transition:navigate", handler);
  }, [router]);

  return (
    <>
      {/* Pastikan PixelTransition merender dan mengisi ref */}
      <PixelTransition ref={pixelRef} pixelSize={80} coverDuration={1} revealDuration={1} />
      {children}
    </>
  );
}
