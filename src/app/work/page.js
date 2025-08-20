// src/app/work/page.js
"use client";

import React from "react";
import InfiniteWorksGrid from "@/components/InfiniteWorksGrid";
import { WORKS } from "@/lib/worksData";
import RevealGate from "@/components/RevealGate";

export default function WorksPage() {
  return (
    <main className="relative min-h-screen w-screen bg-[#e7e7e7] text-black overflow-hidden pb-24">
      {/* Header kecil (opsional) */}
      <div className="pointer-events-none absolute top-6 left-6 z-20 text-sm opacity-70 select-none">
        <span>[WORKS]</span>
      </div>

      {/* Grid baru dirender setelah reveal selesai (tanpa teks loading) */}
      <RevealGate timeout={1500} enabled>
        <InfiniteWorksGrid items={WORKS} />
      </RevealGate>

      {/* Footer hint (opsional) */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-xs opacity-60 select-none">
        drag / swipe • trackpad scroll
      </div>
    </main>
  );
}
