// src/app/work/page.js
"use client";

import React from "react";
import InfiniteWorksGrid from "@/components/InfiniteWorksGrid";
import { WORKS } from "@/lib/worksData";
import Navbar from "@/components/Navbar"; // ⬅️ tambahkan ini

export default function WorksPage() {
  return (
    <main className="relative min-h-screen w-screen bg-[#0D0D0D] text-white overflow-hidden">
      {/* Header kecil (opsional) */}
      <div className="pointer-events-none absolute top-6 left-6 z-20 text-sm opacity-70">
        <span>[WORKS]</span>
      </div>

      {/* Grid tak-berujung */}
      <InfiniteWorksGrid items={WORKS} />

      {/* Footer hint (opsional) */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-xs opacity-60">
        drag / swipe • trackpad scroll
      </div>

      {/* Navbar bawah */}
      <Navbar /> {/* ⬅️ ini fixed & z-50, jadi muncul di atas grid */}
    </main>
  );
}
