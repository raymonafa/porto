// src/components/Navbar.jsx
"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import ShapeButton from "@/components/ShapeButton";
import { useAudio } from "@/components/AudioProvider";

const ASCII = ["⁕","※","⊙","∘","∀","9","1",">","-","6"];

// Tambah jeda setelah overlay done, supaya nav tidak “nyelonong”
const NAV_REVEAL_HOLD_MS = 600;

export default function Navbar() {
  const pathname = usePathname();
  const isHome  = pathname === "/";
  const isWork  = pathname.startsWith("/work");
  const isAbout = pathname.startsWith("/about");

  // ===== labels & ascii hover =====
  const originals = { manamona: "[MANAMONA]", works: "[WORKS]", who: "[WHO]" };
  const [labels, setLabels] = useState(originals);
  const iv = useRef({}), to = useRef({});

  const burst = (t, p=0.45) =>
    t.split("").map(ch => (Math.random() < p ? ASCII[(Math.random()*ASCII.length)|0] : ch)).join("");

  const stop = (k) => {
    if (iv.current[k]) clearInterval(iv.current[k]);
    if (to.current[k]) clearTimeout(to.current[k]);
    iv.current[k] = to.current[k] = null;
    setLabels(v => ({ ...v, [k]: originals[k] }));
  };

  const start = (k, d=400) => {
    stop(k);
    iv.current[k] = setInterval(() => {
      setLabels(v => ({ ...v, [k]: burst(originals[k]) }));
    }, 60);
    to.current[k] = setTimeout(() => stop(k), d);
  };

  useEffect(() => {
    return () => {
      Object.values(iv.current).forEach(clearInterval);
      Object.values(to.current).forEach(clearTimeout);
    };
  }, []);

  // ===== reveal from bottom =====
  const btn1 = useRef(null);
  const btn2 = useRef(null);
  const btn3 = useRef(null);
  const audioBtnRef = useRef(null);
  const tlRef = useRef(null);
  const playedRef = useRef(false);

  // initial hidden only on Home
  const initHome = isHome ? { transform: "translateY(28px)", opacity: 0 } : undefined;

  useLayoutEffect(() => {
    const els = [btn1.current, btn2.current, btn3.current, audioBtnRef.current];
    if (!isHome) {
      gsap.set(els, { y: 0, opacity: 1, clearProps: "willChange" });
      playedRef.current = false;
      return;
    }
    gsap.set(els, { y: 28, opacity: 0, willChange: "transform,opacity" });
  }, [isHome]);

  useEffect(() => {
    if (!isHome) return;

    const play = () => {
      if (playedRef.current) return;
      const els = [btn1.current, btn2.current, btn3.current, audioBtnRef.current];
      if (els.some(e => !e)) return;

      if (tlRef.current) tlRef.current.kill();
      tlRef.current = gsap.timeline({ defaults: { ease: "power4.inOut" } })
        .set(els, { pointerEvents: "none" })
        .to({}, { duration: NAV_REVEAL_HOLD_MS / 1000 })
        .to(btn1.current, { y: 0, opacity: 1, duration: 0.8 }, 0.12)
        .to(btn2.current, { y: 0, opacity: 1, duration: 0.8 }, 0.24)
        .to(btn3.current, { y: 0, opacity: 1, duration: 0.8 }, 0.36)
        .to(audioBtnRef.current, { y: 0, opacity: 1, duration: 0.8 }, 0.48)
        .add(() => {
          gsap.set(els, { clearProps: "willChange" });
          gsap.set(els, { pointerEvents: "auto" });
          playedRef.current = true;
        });
    };

    const onOverlay = () => play();              // dari Home (overlay selesai)
    window.addEventListener("mm:overlay:done", onOverlay);
    const fallback = setTimeout(play, 3000);     // jaga-jaga

    return () => {
      window.removeEventListener("mm:overlay:done", onOverlay);
      clearTimeout(fallback);
      if (tlRef.current) tlRef.current.kill();
    };
  }, [isHome]);

  return (
    <>
      {/* NAV utama — sejajar padding overlay (px-10), full width */}
      <nav
        className="fixed bottom-6 inset-x-0 z-[12000] px-10 flex justify-center gap-px pointer-events-auto"
        data-suppress-trail
      >
        <div ref={btn1} className="inline-block" style={initHome}>
          <ShapeButton
            href="/"
            label={labels.manamona}
            shapeSrc="/buttons/button1.svg"
            active={isHome}
            onMouseEnter={() => start("manamona")}
            onMouseLeave={() => stop("manamona")}
          />
        </div>

        <div ref={btn2} className="inline-block" style={initHome}>
          <ShapeButton
            href="/work"
            label={labels.works}
            shapeSrc="/buttons/button2.svg"
            active={isWork}
            onMouseEnter={() => start("works")}
            onMouseLeave={() => stop("works")}
          />
        </div>

        <div ref={btn3} className="inline-block" style={initHome}>
          <ShapeButton
            href="/about"
            label={labels.who}
            shapeSrc="/buttons/button3.svg"
            active={isAbout}
            onMouseEnter={() => start("who")}
            onMouseLeave={() => stop("who")}
          />
        </div>
      </nav>

      {/* Tombol AUDIO — ikut hidden+reveal seperti nav */}
      <AudioBubble refEl={audioBtnRef} isHome={isHome} />
    </>
  );
}

/* ====== Audio bubble (mute/unmute) ====== */
function AudioBubble({ refEl, isHome }) {
  const audio = useAudio();
  if (!audio) return null;

  const { playing, muted } = audio;
  const isOn = playing && !muted;

  return (
    <div
      ref={refEl}
      className="fixed left-10 bottom-6 z-[12000] pointer-events-auto select-none"
      style={isHome ? { transform: "translateY(28px)", opacity: 0 } : undefined}
      data-suppress-trail
    >
      <button
        onClick={async () => {
          if (!playing) await audio.play(); else audio.toggleMuted();
        }}
        className="group flex items-center gap-2 rounded-full bg-white/85 backdrop-blur px-3 py-2 shadow hover:bg-white transition"
        title={isOn ? "Sound on — click to mute" : "Muted — click to play/unmute"}
      >
        <span className="inline-grid place-items-center w-8 h-8 rounded-full border border-black/10 bg-white" aria-hidden>
          <span className={`block w-3 h-3 rounded-full ${isOn ? "bg-[#2ecc71]" : "bg-[#e74c3c]"}`} />
        </span>
        <span className="font-mono text-xs text-black/80 pr-1">
          {isOn ? "Sound on" : "Muted"}
        </span>
      </button>
    </div>
  );
}
