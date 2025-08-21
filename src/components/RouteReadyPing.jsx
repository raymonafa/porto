// src/components/RouteReadyPing.jsx
"use client";

import { useEffect } from "react";

/**
 * Kirim sinyal bahwa route/page SUDAH mounted di client.
 * - Selalu dispatch "app:route:ready" saat mount.
 * - Kalau tidak ada navigasi in-flight, berarti ini first load / direct open:
 *   langsung lepas gate reveal biar konten tampil normal.
 */
export default function RouteReadyPing() {
  useEffect(() => {
    // Route baru siap
    window.dispatchEvent(new Event("app:route:ready"));

    // First load / direct open (bukan during transition)?
    if (!window.__mmNavInFlight) {
      // Lepas gate reveal next frame supaya tidak flicker
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("app:transition:reveal:done"));
      });
    }
  }, []);

  return null;
}
