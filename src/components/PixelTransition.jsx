// src/components/PixelTransition.jsx
"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import gsap from "gsap";

function makeCells(container, { pixelSize, color }) {
  // bersihkan isi lama
  while (container.firstChild) container.removeChild(container.firstChild);

  const vw = Math.ceil(window.innerWidth / pixelSize);
  const vh = Math.ceil(window.innerHeight / pixelSize);

  // pakai CSS grid biar ringan
  Object.assign(container.style, {
    display: "grid",
    gridTemplateColumns: `repeat(${vw}, ${pixelSize}px)`,
    gridTemplateRows: `repeat(${vh}, ${pixelSize}px)`,
    gap: "0px",
  });

  const cells = [];
  const total = vw * vh;
  for (let i = 0; i < total; i++) {
    const d = document.createElement("div");
    d.style.width = `${pixelSize}px`;
    d.style.height = `${pixelSize}px`;
    // start transparan; nanti "menyala" via gsap dengan durasi 0 (snap)
    d.style.backgroundColor = "transparent";
    d.style.willChange = "background-color";
    container.appendChild(d);
    cells.push(d);
  }
  return { cells, grid: [vh, vw] }; // urutan: [rows, cols]
}

const PixelTransition = forwardRef(
  (
    {
      pixelSize = 80,     // ukuran tile
      color = "#D3FB43",  // warna cover
      coverDuration = 0.8,  // total waktu proses cover (dipakai untuk jarak stagger, per-tile tetap snap)
      revealDuration = 0.8, // total waktu proses reveal (dipakai untuk jarak stagger, per-tile tetap snap)
    },
    ref
  ) => {
    const wrapRef = useRef(null);
    const gridRef = useRef(null);
    const tlRef = useRef(null);

    // container overlay fixed
    useEffect(() => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      Object.assign(wrap.style, {
        position: "fixed",
        inset: "0",
        zIndex: "999999",
        pointerEvents: "none",
        display: "none", // idle = tidak terlihat
        contain: "strict", // hindari scroll-jump saat animasi
      });
      const grid = gridRef.current;
      Object.assign(grid.style, {
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      });
    }, []);

    useImperativeHandle(ref, () => ({
      /**
       * Transisi tanpa scale/opacity:
       * 1) COVER: tiap tile "menyala" (bg -> color) instan, urutan acak (stagger).
       * 2) onCovered(): router.push + tunggu app:route:ready
       * 3) REVEAL: tiap tile "mati" (bg -> transparent) instan, urutan acak.
       * 4) dispatch "app:transition:reveal:done"
       */
      play(onCovered) {
        const wrap = wrapRef.current;
        const grid = gridRef.current;
        if (!wrap || !grid) return;

        // kill tl lama jika ada
        if (tlRef.current) {
          tlRef.current.kill();
          tlRef.current = null;
        }

        // siapkan grid sesuai viewport saat ini
        const { cells, grid: dims } = makeCells(grid, { pixelSize, color });

        // tampilkan overlay
        wrap.style.display = "block";

        // Pastikan initial state transparan
        gsap.set(cells, { backgroundColor: "transparent" });

        // COVER: durasi 0 per tile (snap), tapi dengan stagger acak sepanjang coverDuration
        const tl = gsap.timeline({ defaults: { ease: "none" } });

        tl.to(cells, {
          duration: 0, // instant per tile
          backgroundColor: color,
          stagger: {
            // pakai skema "each ~ amount/32" seperti versi kamu
            each: (coverDuration / Math.max(1, cells.length)) * 32,
            grid: dims, // [rows, cols]
            from: "random",
          },
          onComplete: async () => {
            // ⬇️ PATCH PENTING: benar-benar tunggu onCovered selesai
            try {
              await Promise.resolve(onCovered?.());
            } catch (e) {
              // jangan blokir bila error
              // console.error(e);
            }

            // jika selama nunggu ada transisi baru, hentikan
            if (tlRef.current !== tl) return;

            // REVEAL: matikan pixel secara instan per tile, urutan acak
            gsap.to(cells, {
              duration: 0, // instant per tile
              backgroundColor: "transparent",
              stagger: {
                each: (revealDuration / Math.max(1, cells.length)) * 32,
                grid: dims,
                from: "random",
              },
              ease: "none",
              onComplete: () => {
                // bersih-bersih & beritahu selesai
                wrap.style.display = "none";
                while (grid.firstChild) grid.removeChild(grid.firstChild);
                window.dispatchEvent(new Event("app:transition:reveal:done"));
              },
            });
          },
        });

        tlRef.current = tl;
      },
    }));

    return (
      <div ref={wrapRef} aria-hidden>
        <div ref={gridRef} />
      </div>
    );
  }
);

export default PixelTransition;
