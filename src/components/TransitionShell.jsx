// src/components/TransitionShell.jsx
"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PixelTransition from "@/components/PixelTransition";

export default function TransitionShell({ children }) {
  const router = useRouter();
  const pixelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      const { href } = e.detail || {};
      if (!href) return;
      pixelRef.current?.play(() => router.push(href));
    };
    window.addEventListener("app:transition:navigate", handler);
    return () => window.removeEventListener("app:transition:navigate", handler);
  }, [router]);

  return (
    <>
      <PixelTransition ref={pixelRef} pixelSize={80} coverDuration={0.05} revealDuration={0.1} />
      {children}
    </>
  );
}
