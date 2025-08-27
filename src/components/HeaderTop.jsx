"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Sun as SunIcon, Moon as MoonIcon } from "@phosphor-icons/react";

const ASCII = ["?", "'", "o", "∘", "∀", "M", "1", "1", "N"];

const CITY  = "JAKARTA, IDN";
const COORD = `6° 12' 0.0000'' S 106° 48' 59.9976'' E`; // literal, tanpa <>
const WIDTH_PAD_PX = 0; // tambah kalau mau nafas ekstra saat ASCII idle

function formatJakartaTime(d = new Date()) {
  const t = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(d);
  return t.replace(".", ":") + " WIB";
}
function isDayInJakarta(d = new Date()) {
  const h = parseInt(
    new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    })
      .format(d)
      .replace(/\D/g, ""),
    10
  );
  return h >= 6 && h < 18; // 06:00–17:59 = sun, sisanya moon
}

export default function HeaderTop() {
  const [cityOut, setCityOut] = useState("");
  const [coordOut, setCoordOut] = useState("");
  const [timeLabel, setTimeLabel] = useState(formatJakartaTime());
  const [isDay, setIsDay] = useState(isDayInJakarta());
  const [ready, setReady] = useState(false);

  // refs
  const rootRef = useRef(null);
  const widthWrapRef = useRef(null);
  const ghostCoordRef = useRef(null);
  const ghostTopRef = useRef(null);
  const topRowRef = useRef(null);
  const coordRef = useRef(null);
  const rightLabelRef = useRef(null); // "TECH CRAFTER"

  const startedRef = useRef(false);
  const asciiTimersRef = useRef({}); // { key: {interval, timeout} }

  /* Lock width = MAX(ghost koordinat, ghost baris atas) + padding */
  useEffect(() => {
    if (!widthWrapRef.current) return;
    const apply = () => {
      const wCoord = ghostCoordRef.current
        ? ghostCoordRef.current.getBoundingClientRect().width
        : 0;
      const wTop = ghostTopRef.current
        ? ghostTopRef.current.getBoundingClientRect().width
        : 0;
      const w = Math.max(wCoord, wTop) + WIDTH_PAD_PX;
      widthWrapRef.current.style.width = `${w}px`;
    };

    const ros = [];
    [ghostCoordRef, ghostTopRef].forEach((r) => {
      if (r.current) {
        const ro = new ResizeObserver(apply);
        ro.observe(r.current);
        ros.push(ro);
      }
    });

    window.addEventListener("resize", apply);
    apply();

    return () => {
      ros.forEach((ro) => ro.disconnect());
      window.removeEventListener("resize", apply);
    };
  }, []);

  /* Start after overlay: type once → idle ASCII loop */
  useEffect(() => {
    const kick = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      setReady(true);
      typeOnce(CITY, setCityOut, {
        scrambleMs: 16,
        revealMs: 46,
        onDone: () => startIdleAscii(CITY, setCityOut, asciiTimersRef, "city"),
      });
      typeOnce(COORD, setCoordOut, {
        scrambleMs: 14,
        revealMs: 38,
        startDelayMs: 90,
        onDone: () => startIdleAscii(COORD, setCoordOut, asciiTimersRef, "coord"),
      });
    };
    const on = () => kick();
    window.addEventListener("mm:overlay:done", on);
    const fb = setTimeout(kick, 2200);
    return () => {
      clearTimeout(fb);
      window.removeEventListener("mm:overlay:done", on);
    };
  }, []);

  /* Reveal: fade-only (no slide), power2.inOut */
  useLayoutEffect(() => {
    if (!ready || !rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.set([topRowRef.current, coordRef.current, rightLabelRef.current], { autoAlpha: 0, willChange: "opacity" });
      const tl = gsap.timeline({ defaults: { ease: "power2.inOut", duration: 0.45 } });
      tl.to(topRowRef.current,   { autoAlpha: 1 }, 0.00)
        .to(coordRef.current,    { autoAlpha: 1 }, 0.06)
        .to(rightLabelRef.current,{ autoAlpha: 1 }, 0.06);
    }, rootRef);
    return () => ctx.revert();
  }, [ready]);

  /* Update time & icon periodically */
  useEffect(() => {
    const tick = () => {
      setTimeLabel(formatJakartaTime());
      setIsDay(isDayInJakarta());
    };
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  /* Cleanup ASCII timers */
  useEffect(() => {
    return () => {
      Object.values(asciiTimersRef.current).forEach((obj) => {
        clearInterval(obj?.interval);
        clearTimeout(obj?.timeout);
      });
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="fixed inset-x-10 pt-10 z-[60] select-none"
      style={{ color: "#222222" }} // semua teks & ikon #222
    >
      {/* LEFT: binder width (2 baris info) */}
      <div ref={widthWrapRef}>
        {/* Baris atas: kiri CITY, kanan icon+time (kaku) */}
        <div
          ref={topRowRef}
          className="grid items-center"
          style={{ gridTemplateColumns: "1fr auto" }}
        >
          <div className="text-[12px] tracking-[0.08em] whitespace-nowrap leading-none">
            {cityOut}
          </div>

          <div className="flex items-center gap-2 shrink-0 whitespace-nowrap leading-none">
            {isDay ? (
              <SunIcon size={12} color="#222222" weight="fill" />
            ) : (
              <MoonIcon size={12} color="#222222" weight="fill" />
            )}
            <span className="text-[12px] tracking-[0.08em]">{timeLabel}</span>
          </div>
        </div>

        {/* Baris koordinat (harus sama lebar) */}
        <div className="mt-1">
          <span
            ref={coordRef}
            className="text-[10px] sm:text-[10.5px] tracking-[0.08em] whitespace-pre leading-none"
          >
            {coordOut}
          </span>
        </div>
      </div>

      {/* RIGHT: label “TECH CRAFTER” */}
      <div
        ref={rightLabelRef}
        className="absolute right-0 top-10 text-[12px] tracking-[0.08em] leading-none"
      >
        TECH CRAFTER
      </div>

      {/* Ghost measurers (tak terlihat) */}
      <span
        ref={ghostCoordRef}
        className="invisible absolute pointer-events-none whitespace-pre text-[10px] sm:text-[10.5px] tracking-[0.08em]"
      >
        {COORD}
      </span>

      <div
        ref={ghostTopRef}
        className="invisible absolute pointer-events-none grid items-center"
        style={{ gridTemplateColumns: "1fr auto" }}
      >
        <span className="text-[12px] tracking-[0.08em] whitespace-nowrap leading-none">
          {CITY}
        </span>
        <span className="flex items-center gap-2 whitespace-nowrap leading-none">
          <span style={{ width: 12, height: 12, display: "inline-block" }} />
          <span className="text-[12px] tracking-[0.08em]">00:00 WIB</span>
        </span>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function typeOnce(
  finalText,
  setter,
  { scrambleMs = 20, revealMs = 45, startDelayMs = 0, onDone = () => {} } = {}
) {
  let revealIndex = 0;
  let scrambleId = 0;
  let revealId = 0;
  let stopped = false;

  const scramble = () => {
    if (stopped) return;
    const out = finalText
      .split("")
      .map((ch, j) => (j < revealIndex ? ch : ASCII[(Math.random() * ASCII.length) | 0]))
      .join("");
    setter(out);
    scrambleId = window.setTimeout(scramble, scrambleMs);
  };

  const reveal = () => {
    if (stopped) return;
    revealIndex += 1;
    if (revealIndex > finalText.length) {
      stopped = true;
      if (scrambleId) window.clearTimeout(scrambleId);
      setter(finalText);
      onDone?.();
      return;
    }
    revealId = window.setTimeout(reveal, revealMs);
  };

  const start = () => {
    scramble();
    revealId = window.setTimeout(reveal, revealMs);
  };

  if (startDelayMs > 0) window.setTimeout(start, startDelayMs);
  else start();

  return () => {
    stopped = true;
    if (scrambleId) window.clearTimeout(scrambleId);
    if (revealId) window.clearTimeout(revealId);
  };
}

/** Idle ASCII shimmer kontinu */
function startIdleAscii(text, setter, bagRef, key, { rateMs = 280, durMs = 110 } = {}) {
  if (!bagRef.current) bagRef.current = {};
  const bag = (bagRef.current[key] = { interval: null, timeout: null });

  const glyphs = text.split("");
  const indices = glyphs
    .map((ch, i) => ({ ch, i }))
    .filter(({ ch }) => ch.trim().length > 0)
    .map(({ i }) => i);

  const tick = () => {
    if (!indices.length) return;
    const count = Math.random() < 0.6 ? 1 : 2;
    const picks = [];
    for (let k = 0; k < count; k++) picks.push(indices[(Math.random() * indices.length) | 0]);
    const mutated = glyphs.slice();
    picks.forEach((idx) => (mutated[idx] = ASCII[(Math.random() * ASCII.length) | 0]));
    setter(mutated.join(""));
    bag.timeout = setTimeout(() => setter(text), durMs);
  };

  bag.interval = setInterval(tick, rateMs);
  return bag;
}
