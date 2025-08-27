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
        opacity={0.24}
        noise={0.44}
        scanline={0.44}
        bleed={0.24}
        speed={0.4}          // cepat-lambat 2 garis
        thickness={0.05}     // ketebalan garis (0.01 tipis, 0.05 tebal)
        glitchStrength={1.8} // intensitas cahaya pada garis
        rgbSplit={24}       // “chromatic glitch”
        blendMode="screen"
        zIndex={9999}
      />


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
