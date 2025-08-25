// src/app/work/page.js
"use client";

import React from "react";
import InfiniteWorksGrid from "@/components/InfiniteWorksGrid";
import { WORKS } from "@/lib/worksData";
import RevealGate from "@/components/RevealGate";
import RouteReadyPing from "@/components/RouteReadyPing";
import dynamic from "next/dynamic";

const CRTRetroOverlay = dynamic(() => import("@/components/CRTRetroOverlay"), { ssr: false });

export default function WorksPage() {
  return (
    <main className="relative min-h-screen w-screen bg-[#e7e7e7] text-black overflow-hidden pb-24" style={{ cursor: "none" }}>
      {/* sinkronisasi dengan transition controller */}
      <RouteReadyPing />

      {/* CRT overlay (opsional) — sudah pointer-events:none di komponennya */}
      <CRTRetroOverlay
        opacity={0.34}
        noise={0.22}
        scanline={0.2}
        bleed={0.18}
        speed={0.2}          // cepat-lambat 2 garis
        thickness={0.03}     // ketebalan garis (0.01 tipis, 0.05 tebal)
        glitchStrength={1.4} // intensitas cahaya pada garis
        rgbSplit={0.8}       // “chromatic glitch”
        blendMode="screen"
        zIndex={9999}
      />

      <div className="pointer-events-none absolute top-6 left-6 z-20 text-sm opacity-70 select-none">
        <span>[WORKS]</span>
      </div>

      {/* RevealGate: unhide setelah overlay transition selesai */}
      <RevealGate enabled timeout={1500}>
        <InfiniteWorksGrid items={WORKS} />
      </RevealGate>

      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-xs opacity-60 select-none">
        drag / swipe • trackpad scroll
      </div>
    </main>
  );
}
