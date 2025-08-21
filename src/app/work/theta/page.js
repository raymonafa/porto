// src/app/work/theta/page.js
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import RevealGate from "@/components/RevealGate";
import RouteReadyPing from "@/components/RouteReadyPing";
import gsap from "gsap";

/* -------------------------
   Utils (Lenis loader, safe)
------------------------- */
async function tryLoadLenis() {
  try {
    // butuh: npm i lenis
    const mod = await import("lenis");
    return mod.default || mod.Lenis || null;
  } catch {
    // jika paket belum terpasang, skip tanpa crash
    return null;
  }
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

  // Mobile breakpoint (SSR-safe)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  return isMobile ? (
    <MobilePage images={IMAGES} />
  ) : (
    <DesktopInfinitePage images={IMAGES} />
  );
}

/* ===================== DESKTOP: INFINITE HORIZONTAL + PANELS ===================== */

function DesktopInfinitePage({ images }) {
  const railRef = useRef(null);
  const baseTrackRef = useRef(null); // track “B” for width
  const baseW = useRef(0);

  const isDrag = useRef(false);
  const startX = useRef(0);
  const startLeft = useRef(0);
  const vel = useRef(0);
  const rafId = useRef(0);

  // measure base width and position at start of B
  useEffect(() => {
    const rail = railRef.current;
    const base = baseTrackRef.current;
    if (!rail || !base) return;

    const measure = () => {
      baseW.current = base.getBoundingClientRect().width;
      rail.scrollLeft = baseW.current;
    };

    measure();
    requestAnimationFrame(measure);

    const onResize = () => {
      const ratio = (rail.scrollLeft / Math.max(1, baseW.current)) % 1;
      measure();
      rail.scrollLeft = baseW.current * (1 + ratio);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // keep scroll within track B (wrap)
  const wrapToMiddle = () => {
    const rail = railRef.current;
    const B = baseW.current;
    if (!rail || !B) return;
    const s = rail.scrollLeft;
    if (s < B * 0.5) rail.scrollLeft = s + B;
    else if (s > B * 1.5) rail.scrollLeft = s - B;
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const wheelGain = 1.0;
    const damp = 0.92;

    const onWheel = (e) => {
      const dx = e.deltaX || 0;
      const dy = e.deltaY || 0;
      const delta = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
      if (!delta) return;
      e.preventDefault(); // force horizontal
      rail.scrollLeft += delta * wheelGain;
      vel.current = delta * wheelGain;
      wrapToMiddle();
    };

    const onPointerDown = (e) => {
      isDrag.current = true;
      startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      startLeft.current = rail.scrollLeft;
      rail.classList.add("cursor-grabbing");
      rail.classList.remove("cursor-grab");
    };
    const onPointerMove = (e) => {
      if (!isDrag.current) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const dx = x - startX.current;
      rail.scrollLeft = startLeft.current - dx;
      vel.current = -(dx - 0);
      wrapToMiddle();
    };
    const onPointerUp = () => {
      isDrag.current = false;
      rail.classList.remove("cursor-grabbing");
      rail.classList.add("cursor-grab");
    };

    const tick = () => {
      rafId.current = requestAnimationFrame(tick);
      if (!isDrag.current && Math.abs(vel.current) > 0.1) {
        rail.scrollLeft += vel.current;
        vel.current *= damp;
        wrapToMiddle();
      }
    };
    rafId.current = requestAnimationFrame(tick);

    const onKey = (e) => {
      if (e.key === "ArrowRight") {
        rail.scrollLeft += 100;
        wrapToMiddle();
      }
      if (e.key === "ArrowLeft") {
        rail.scrollLeft -= 100;
        wrapToMiddle();
      }
    };

    rail.addEventListener("wheel", onWheel, { passive: false });
    rail.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    rail.addEventListener("touchstart", onPointerDown, { passive: true });
    rail.addEventListener("touchmove", onPointerMove, { passive: true });
    rail.addEventListener("touchend", onPointerUp);
    rail.addEventListener("keydown", onKey);
    rail.classList.add("cursor-grab");
    rail.tabIndex = 0;
    rail.focus({ preventScroll: true });

    // small enter animation (after reveal)
    const onReveal = () => {
      const h = rail.querySelector("[data-hero-enter]");
      if (h) gsap.fromTo(h, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" });
    };
    window.addEventListener("app:transition:reveal:done", onReveal, { once: true });

    return () => {
      cancelAnimationFrame(rafId.current);
      rail.removeEventListener("wheel", onWheel);
      rail.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      rail.removeEventListener("touchstart", onPointerDown);
      rail.removeEventListener("touchmove", onPointerMove);
      rail.removeEventListener("touchend", onPointerUp);
      rail.removeEventListener("keydown", onKey);
      window.removeEventListener("app:transition:reveal:done", onReveal);
    };
  }, []);

  const renderTrack = (key) => (
    <div key={key} className="inline-flex h-full items-stretch">
      {/* HERO */}
      <PanelHeroDesktop src={images[0]} />

      {/* TEXT SECTION */}
      <PanelText
        heading="Overview"
        copy="Theta adalah eksplorasi antarmuka imersif. Fokus pada pengalaman sinematik dan detail mikro yang mendukung narasi produk."
      />

      {/* GALLERY */}
      {images.slice(1).map((src, i) => (
        <PanelImageDesktop key={`${key}-${i}`} src={src} index={i} />
      ))}

      {/* CREDITS */}
      <PanelCredits
        items={[
          ["Client", "Internal Concept"],
          ["Role", "Design, Development, R&D"],
          ["Year", "2025"],
          ["Stack", "Next.js, WebGL, GSAP"],
        ]}
      />

      <div className="shrink-0 w-[8vw]" />
    </div>
  );

  return (
    <main className="fixed inset-0 z-0 bg-[#f8f8f8] text-black overflow-hidden">
      <RouteReadyPing />
      <RevealGate enabled timeout={900}>
        <div
          ref={railRef}
          className="h-[100svh] w-[100vw] whitespace-nowrap overflow-x-auto overflow-y-hidden outline-none"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}`}</style>

          {/* A | B | C with B measured */}
          <div className="hide-scrollbar inline-flex h-full items-stretch">
            {renderTrack("A")}
            <div ref={baseTrackRef}>{renderTrack("B")}</div>
            {renderTrack("C")}
          </div>
        </div>
      </RevealGate>
    </main>
  );
}

/* ===== DESKTOP PANELS ===== */

function PanelHeroDesktop({ src }) {
  return (
    <section
      className="relative h-full w-[100vw] shrink-0 overflow-hidden"
      style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "saturate(0.92) contrast(1.02)",
        }}
      />
      <div className="absolute inset-0 from-black/35 to-transparent bg-gradient-to-t" />
      <div className="relative z-10 h-full flex items-end" data-hero-enter>
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
            Eksplorasi interface imersif. Scroll menyamping (loop tak berujung).
          </p>
        </div>
      </div>
    </section>
  );
}

function PanelText({ heading, copy }) {
  return (
    <article
      className="relative h-full shrink-0 mr-[6vw] last:mr-0 rounded-2xl overflow-hidden bg-white"
      style={{ width: "48vw", boxShadow: "0 8px 40px rgba(0,0,0,0.06)" }}
    >
      <div className="h-full w-full grid place-items-center p-10">
        <div className="max-w-[32rem]">
          <h2 className="font-mono text-xl tracking-widest mb-3 uppercase">{heading}</h2>
          <p className="text-[15px] leading-7 text-[#222] opacity-90">
            {copy}
          </p>
        </div>
      </div>
    </article>
  );
}

function PanelImageDesktop({ src, index }) {
  const widths = ["70vw", "56vw", "66vw", "60vw", "72vw", "58vw"];
  const w = widths[index % widths.length];
  return (
    <article
      className="relative h-full shrink-0 mr-[6vw] last:mr-0 rounded-2xl overflow-hidden"
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

function PanelCredits({ items = [] }) {
  return (
    <article
      className="relative h-full shrink-0 mr-[6vw] last:mr-0 rounded-2xl overflow-hidden bg-white"
      style={{ width: "40vw", boxShadow: "0 8px 40px rgba(0,0,0,0.06)" }}
    >
      <div className="h-full w-full p-10 grid place-items-center">
        <div className="w-full max-w-md">
          <h2 className="font-mono text-xl tracking-widest mb-4 uppercase">Credits</h2>
          <ul className="grid grid-cols-1 gap-2 text-[15px] text-[#222]">
            {items.map(([k, v], i) => (
              <li key={i} className="flex justify-between gap-6">
                <span className="opacity-60">{k}</span>
                <span className="font-medium">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

/* ===================== MOBILE: VERTICAL + LENIS (optional) ===================== */

function MobilePage({ images }) {
  const heroRef = useRef(null);

  // Lenis (optional): kalau gagal load, fallback ke native
  useEffect(() => {
    let lenis = null;
    let raf = 0;

    (async () => {
      const Lenis = await tryLoadLenis();
      if (!Lenis) return; // tidak terpasang → skip

      lenis = new Lenis({
        duration: 1.0,
        smoothWheel: true,
        smoothTouch: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.0,
      });

      const loop = (time) => {
        lenis.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    // enter anim kecil untuk hero
    const h = heroRef.current;
    if (h) gsap.fromTo(h, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (lenis) lenis.destroy();
    };
  }, []);

  return (
    <main className="min-h-screen w-screen bg-[#f8f8f8] text-black overflow-x-hidden">
      <RouteReadyPing />
      <RevealGate enabled timeout={900}>
        {/* HERO */}
        <section className="relative h-[100svh] w-full overflow-hidden" ref={heroRef}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${images[0]})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.25),transparent_40%)] pointer-events-none" />
          <div className="relative z-10 h-full flex items-end">
            <div className="p-6 w-full">
              <h1 className="font-mono text-4xl text-white tracking-wider">THETA</h1>
              <p className="mt-3 text-white/85 text-sm">
                Galeri di bawah ini — scroll vertikal (Lenis aktif bila tersedia).
              </p>
            </div>
          </div>
        </section>

        {/* OVERVIEW TEXT */}
        <section className="bg-white">
          <div className="px-5 py-8 max-w-xl">
            <h2 className="font-mono text-base tracking-widest uppercase mb-2">Overview</h2>
            <p className="text-[15px] leading-7 text-[#222] opacity-90">
              Theta adalah eksplorasi antarmuka imersif. Fokus pada pengalaman sinematik
              dan detail mikro yang mendukung narasi produk.
            </p>
          </div>
        </section>

        {/* GALLERY */}
        <section className="bg-[#f8f8f8]">
          <div className="mx-auto px-4 py-8 grid gap-4">
            {images.slice(1).map((src, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.08)]"
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

        {/* CREDITS */}
        <section className="bg-white">
          <div className="px-5 py-10 max-w-xl">
            <h2 className="font-mono text-base tracking-widest uppercase mb-3">Credits</h2>
            <ul className="grid gap-2 text-[15px]">
              <li className="flex justify-between"><span className="opacity-60">Client</span><span>Internal Concept</span></li>
              <li className="flex justify-between"><span className="opacity-60">Role</span><span>Design, Development, R&amp;D</span></li>
              <li className="flex justify-between"><span className="opacity-60">Year</span><span>2025</span></li>
              <li className="flex justify-between"><span className="opacity-60">Stack</span><span>Next.js, WebGL, GSAP</span></li>
            </ul>
          </div>
        </section>

        <section className="py-12 text-center text-xs opacity-70">
          © 2025 THETA
        </section>
      </RevealGate>
    </main>
  );
}
