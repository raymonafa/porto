// src/components/RevealGate.jsx
"use client";

import React, { useEffect, useState } from "react";

/**
 * RevealGate menunda render children sampai event 'app:transition:reveal:done' diterima.
 * - Tidak menampilkan placeholder / loading (return null sampai siap).
 * - Ada fallback timeout jika event tidak pernah datang (mis. hard refresh).
 *
 * Props:
 * - eventName: string (default: "app:transition:reveal:done")
 * - timeout: number ms (default: 1500)
 * - enabled: boolean (default: true) -> set false untuk bypass gate (langsung render)
 */
export default function RevealGate({
  children,
  eventName = "app:transition:reveal:done",
  timeout = 1500,
  enabled = true,
}) {
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    let timeoutId;

    const onDone = () => {
      clearTimeout(timeoutId);
      setReady(true);
      window.removeEventListener(eventName, onDone);
    };

    // dengarkan sekali saja
    window.addEventListener(eventName, onDone, { once: true });

    // fallback: kalau event tak datang (mis. refresh langsung ke halaman)
    timeoutId = setTimeout(() => {
      setReady(true);
      window.removeEventListener(eventName, onDone);
    }, timeout);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener(eventName, onDone);
    };
  }, [enabled, eventName, timeout]);

  if (!ready) return null;
  return <>{children}</>;
}
