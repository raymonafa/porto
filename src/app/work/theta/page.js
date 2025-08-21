// src/app/work/theta/page.js
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import RevealGate from "@/components/RevealGate";
import RouteReadyPing from "@/components/RouteReadyPing";

// (opsional) Lenis buat smoothing hero & mobile. Tidak mempengaruhi scroller horizontal.
async function loadLenis() {
  const mod = await import("lenis"); // pastikan: npm i lenis
  return mod.default || mod;
}

export default function ThetaPage() {
  const IMAGES = useMemo(
    () => [
      "/images/theta/hero.jpg",
      "/images/theta/shot-01.jpg",
      "/images/theta/shot-02.jpg",
      "/images/theta/shot-03.jpg",
      "/images/theta/shot-04.jpg",
      "/images/theta/shot-05.jpg",
      "/images/theta/shot-06.jpg",
    ],
    []
  );

  // Mobile: fallback vertikal
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Lenis hanya untuk halaman ini (tidak mengganggu scroller horizontal)
  useEffect(() => {
    let lenis;
    let rafId = 0;
    const prm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (prm.matches) return;

    let mounted = true;
    (async () => {
      const Lenis = await loadLenis();
      if (!mounted) return;
      lenis = new Lenis({
        smoothWheel: true,
        smoothTouch: false,
        lerp: 0.12,
        wheelMultiplier: 1,
      });
      const raf = (t) => {
        lenis?.raf(t);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    })();

    return () => {
      mounted = false;
      if (rafId) cancelAnimationFrame(rafId);
      lenis?.destroy();
    };
  }, []);

  return (
    <main className="relative min-h-screen w-screen bg-[#f8f8f8] text-black overflow-x-hidden">
      <RouteReadyPing />
      <RevealGate enabled timeout={1200}>
        {/* ===== HERO (100svh) ===== */}
        <section className="relative h-[100svh] w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${IMAGES[0]})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "saturate(0.92) contrast(1.02)",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.25),transparent_40%)] pointer-events-none" />
          <div className="relative z-10 h-full flex items-end">
            <div className="p-6 md:p-10 lg:p-14 w-full">
              <div className="flex items-end justify-between gap-4">
                <h1 className="font-mono text-3xl md:text-5xl lg:text-6xl text-white tracking-wider">
                  THETA
                </h1>
                <div className="text-right text-white/90 text-xs md:text-sm leading-relaxed">
                  <div>Client — Internal Concept</div>
                  <div>Role — Design, Dev, R&amp;D</div>
                  <div>Year — 2025</div>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-white/85 text-sm md:text-base">
                Eksplorasi interface imersif dengan perpaduan typographic grid, motion, dan
                visual treatment retro-modern. Dibuat untuk menguji arsitektur UI yang
                tetap performan meski kaya interaksi.
              </p>
            </div>
          </div>
        </section>

        {/* ===== GALLERY ===== */}
        {isMobile ? (
          <VerticalGallery images={IMAGES.slice(1)} />
        ) : (
          <HorizontalRail images={IMAGES.slice(1)} />
        )}

        {/* ===== OUTRO ===== */}
        <section className="py-16 md:py-24 bg-[#0f0f10] text-white">
          <div className="max-w-5xl mx-auto px-6 md:px-10">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-mono text-sm opacity-70">Deliverables</h3>
                <ul className="mt-3 space-y-1 text-sm opacity-95">
                  <li>Interactive Prototype</li>
                  <li>Motion System</li>
                  <li>WebGL Overlay FX</li>
                </ul>
              </div>
              <div>
                <h3 className="font-mono text-sm opacity-70">Stack</h3>
                <ul className="mt-3 space-y-1 text-sm opacity-95">
                  <li>Next.js (App Router)</li>
                  <li>Lenis Smooth Scroll</li>
                  <li>GSAP / WebGL overlay</li>
                </ul>
              </div>
              <div>
                <h3 className="font-mono text-sm opacity-70">Notes</h3>
                <p className="mt-3 text-sm opacity-95">
                  Scroller horizontal full-native (overflow-x). Mouse-wheel vertikal otomatis
                  dikonversi ke gerak horizontal, plus drag-to-pan dan keyboard arrows.
                  Mobile tetap vertikal demi performa.
                </p>
              </div>
            </div>
          </div>
        </section>
      </RevealGate>
    </main>
  );
}

/* =================== DESKTOP: TRUE HORIZONTAL =================== */

function HorizontalRail({ images = [] }) {
  const railRef = useRef(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const vel = useRef(0); // untuk sedikit inertia
  const raf = useRef(0);

  // Wheel → scrollLeft (konversi vertikal ke horizontal)
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    const onWheel = (e) => {
      // izinkan horizontal native jika user scroll ke samping
      const dx = e.deltaX || 0;
      const dy = e.deltaY || 0;

      // jika masih ada ruang untuk scroll secara horizontal, cegah scroll vertikal default
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;

      // jika dy dominan, kita pakai untuk horizontal
      if (Math.abs(dy) > Math.abs(dx)) {
        e.preventDefault(); // penting: jadikan handler non-passive
        const gain = 0.9;   // besaran konversi
        el.scrollLeft += dy * gain;
        vel.current = dy * gain; // simpan buat inertia
      } else if (!atStart && !atEnd) {
        // horizontal native: biarkan saja
        vel.current = dx;
      }
    };

    // drag-to-pan
    const onDown = (e) => {
      isDragging.current = true;
      lastX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      el.classList.add("cursor-grabbing");
      el.classList.remove("cursor-grab");
    };
    const onMove = (e) => {
      if (!isDragging.current) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const dx = x - lastX.current;
      lastX.current = x;
      el.scrollLeft -= dx; // drag natural
      vel.current = -dx;
    };
    const onUp = () => {
      isDragging.current = false;
      el.classList.remove("cursor-grabbing");
      el.classList.add("cursor-grab");
    };

    // inertia ringan saat lepas drag
    const tick = () => {
      raf.current = requestAnimationFrame(tick);
      if (!isDragging.current && Math.abs(vel.current) > 0.1) {
        el.scrollLeft += vel.current;
        vel.current *= 0.92; // damping
      }
    };
    raf.current = requestAnimationFrame(tick);

    // listeners
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // touch (optional — native horizontal sudah ok, tapi kita sinkron drag state)
    el.addEventListener("touchstart", onDown, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onUp);

    // keyboard
    const onKey = (e) => {
      if (e.key === "ArrowRight") el.scrollLeft += 80;
      if (e.key === "ArrowLeft") el.scrollLeft -= 80;
    };
    el.addEventListener("keydown", onKey);

    // cursor state awal
    el.classList.add("cursor-grab");

    return () => {
      cancelAnimationFrame(raf.current);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("touchstart", onDown);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onUp);
      el.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <section className="relative h-[100svh] w-full bg-[#f8f8f8] overflow-hidden">
      <div
        ref={railRef}
        tabIndex={0}
        className="h-full w-full overflow-x-auto overflow-y-hidden whitespace-nowrap outline-none"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        // hide scrollbar webkit
        onScroll={(e) => {
          const el = e.currentTarget;
          el.style.setProperty("--_hidebar", "0"); // trigger style reflow for consistency
        }}
      >
        <style>{`
          [tabindex].h-full::-webkit-scrollbar { display: none; }
        `}</style>

        {/* panels */}
        <div className="inline-flex h-full items-stretch px-[6vw] gap-[6vw]">
          {images.map((src, i) => (
            <Panel key={i} src={src} index={i} />
          ))}
          {/* spacer kecil di ujung biar ada “napas” */}
          <div className="shrink-0" style={{ width: "10vw" }} />
        </div>
      </div>
    </section>
  );
}

function Panel({ src, index }) {
  const widths = ["80vw", "60vw", "72vw", "66vw", "78vw", "62vw"];
  const w = widths[index % widths.length];

  return (
    <article
      className="relative h-full shrink-0 rounded-2xl overflow-hidden"
      style={{ width: w, boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover pointer-events-none select-none"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      <div className="absolute left-4 bottom-3 text-[11px] font-mono tracking-wide bg-black/70 text-white px-2 py-1 rounded">
        THETA — {String(index + 1).padStart(2, "0")}
      </div>
    </article>
  );
}

/* =================== MOBILE: VERTICAL =================== */

function VerticalGallery({ images = [] }) {
  return (
    <section className="bg-[#f8f8f8]">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20 grid gap-6">
        {images.map((src, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden shadow-[0_6px_32px_rgba(0,0,0,0.08)]"
          >
            <img
              src={src}
              alt=""
              className="w-full h-auto object-cover"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
