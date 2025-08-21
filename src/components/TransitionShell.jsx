// src/components/TransitionShell.jsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PixelTransition from "@/components/PixelTransition";

function waitForEventOnce(type, timeout = 6000) {
  return new Promise((resolve) => {
    let to;
    const on = () => {
      clearTimeout(to);
      window.removeEventListener(type, on);
      resolve();
    };
    window.addEventListener(type, on, { once: true });
    to = setTimeout(on, timeout); // fallback agar tidak ngegantung
  });
}

export default function TransitionShell({ children }) {
  const router = useRouter();
  const pixRef = useRef(null);
  const inFlightRef = useRef(false);

  // Reset flag ketika overlay selesai membuka
  useEffect(() => {
    const onRevealDone = () => {
      window.__mmNavInFlight = false;
      inFlightRef.current = false;
    };
    window.addEventListener("app:transition:reveal:done", onRevealDone);
    return () => window.removeEventListener("app:transition:reveal:done", onRevealDone);
  }, []);

  async function safeNavigate(href) {
    if (!href || inFlightRef.current) return;

    // Normalisasi URL internal
    let target;
    try {
      target = new URL(href, window.location.href);
    } catch {
      return;
    }

    // Abaikan jika sama dengan lokasi sekarang
    const now = window.location;
    const same =
      target.pathname === now.pathname &&
      target.search === now.search &&
      target.hash === now.hash;
    if (same) return;

    // Set flag global & lokal
    window.__mmNavInFlight = true;
    inFlightRef.current = true;

    // Mainkan COVER, lalu navigasi & tunggu page baru siap
    pixRef.current?.play(() => {
      try {
        router.push(target.pathname + target.search + target.hash, { scroll: false });
      } catch {
        // Fallback bila router.push gagal (jarang)
        window.location.assign(target.href);
      }
      // Tunggu sinyal dari page baru
      return waitForEventOnce("app:route:ready", 8000);
    });
  }

  // DENGARKAN KEDUA EVENT: "app:navigate" & "app:transition:navigate"
  useEffect(() => {
    const h1 = (e) => safeNavigate(e.detail?.href);
    const h2 = (e) => safeNavigate(e.detail?.href);
    window.addEventListener("app:navigate", h1);
    window.addEventListener("app:transition:navigate", h2);
    return () => {
      window.removeEventListener("app:navigate", h1);
      window.removeEventListener("app:transition:navigate", h2);
    };
  }, []);

  return (
    <>
      <PixelTransition ref={pixRef} />
      {children}
    </>
  );
}
