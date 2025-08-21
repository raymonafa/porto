// src/components/RevealGate.jsx
"use client";
import { useEffect, useState } from "react";

/**
 * Menyembunyikan children sampai transisi selesai TANPA overlay blocking.
 * - Tidak pernah merender elemen penutup dengan pointer-events.
 * - Hanya mengatur visibility children.
 */
export default function RevealGate({ enabled = true, timeout = 1200, children }) {
  const [armed, setArmed] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;
    const on = () => setArmed(true);
    // Lepas gate saat overlay selesai
    window.addEventListener("app:transition:reveal:done", on, { once: true });
    // Fallback (first load tanpa transition)
    const t = setTimeout(on, timeout);
    return () => {
      window.removeEventListener("app:transition:reveal:done", on);
      clearTimeout(t);
    };
  }, [enabled, timeout]);

  return (
    <div style={{ visibility: armed ? "visible" : "hidden" }}>
      {children}
    </div>
  );
}
