// src/app/about/page.js
"use client";

import RevealGate from "@/components/RevealGate";

export default function AboutPage() {
  return (
    <RevealGate enabled timeout={1500}>
      <main className="min-h-screen bg-[#f8f8f8] text-black pb-24">
        <section className="pt-24 px-6">
          About Page
        </section>
      </main>
    </RevealGate>
  );
}
