"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import ShapeButton from "@/components/ShapeButton";
import SoundToggle from "@/components/SoundToggle";

const ASCII = ["✧", "■", "o", "∘", "∀", "M", "1", ">", "N", "☺︎"];

export default function Navbar() {
  const pathname = usePathname();
  const isHome  = pathname === "/";
  const isWork  = pathname.startsWith("/work");
  const isAbout = pathname.startsWith("/about");

  // ====== labels + ASCII burst on hover ======
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

  // ====== bottom-reveal (Home only) ======
  const btn1 = useRef(null);
  const btn2 = useRef(null);
  const btn3 = useRef(null);
  const btnSound = useRef(null);
  const btnSocial = useRef(null); // NEW
  const tlRef = useRef(null);
  const playedRef = useRef(false);

  useLayoutEffect(() => {
    const all = [btn1.current, btn2.current, btn3.current, btnSound.current, btnSocial.current];
    if (!isHome) {
      gsap.set(all, { y: 0, opacity: 1, clearProps: "willChange" });
      playedRef.current = false;
      return;
    }
    gsap.set(all, { y: 28, opacity: 0, willChange: "transform,opacity" });
  }, [isHome]);

  useEffect(() => {
    if (!isHome) return;

    const play = () => {
      if (playedRef.current) return;
      const els = [btn1.current, btn2.current, btn3.current, btnSound.current, btnSocial.current];
      if (els.some(e => !e)) return;

      if (tlRef.current) tlRef.current.kill();
      tlRef.current = gsap.timeline({ defaults: { ease: "power4.inOut" } })
        .to(btn1.current,     { y: 0, opacity: 1, duration: 0.8 }, 0.00)
        .to(btn2.current,     { y: 0, opacity: 1, duration: 0.8 }, 0.12)
        .to(btn3.current,     { y: 0, opacity: 1, duration: 0.8 }, 0.24)
        .to(btnSound.current, { y: 0, opacity: 1, duration: 0.8 }, 0.36)
        .to(btnSocial.current,{ y: 0, opacity: 1, duration: 0.8 }, 0.48)
        .add(() => {
          gsap.set(els, { clearProps: "willChange" });
          playedRef.current = true;
        });
    };

    const onReveal = () => play();
    window.addEventListener("mm:reveal:nav", onReveal);
    const fallback = setTimeout(play, 2200);

    return () => {
      window.removeEventListener("mm:reveal:nav", onReveal);
      clearTimeout(fallback);
      if (tlRef.current) tlRef.current.kill();
    };
  }, [isHome]);

  const sosmedSrc = "/buttons/sosmed.svg";
  const linkedinSrc = "/icons/Linkedin.svg";

  return (
    <>
      {/* nav utama (tengah bawah) */}
      <nav
        className="fixed bottom-6  left-1/2 -translate-x-1/2 z-[12000] flex items-center gap-px pointer-events-auto"
        data-suppress-trail
      >
        <div ref={btn1} className="inline-block">
          <ShapeButton
            href="/"
            label={labels.manamona}
            shapeSrc="/buttons/button1.svg"
            active={isHome}
            onMouseEnter={() => start("manamona")}
            onMouseLeave={() => stop("manamona")}
          />
        </div>

        <div ref={btn2} className="inline-block">
          <ShapeButton
            href="/work"
            label={labels.works}
            shapeSrc="/buttons/button2.svg"
            active={isWork}
            onMouseEnter={() => start("works")}
            onMouseLeave={() => stop("works")}
          />
        </div>

        <div ref={btn3} className="inline-block">
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

      {/* Toggle audio: kiri-bawah */}
      <div
        ref={btnSound}
        className="fixed bottom-6 left-0 z-[12000] pointer-events-auto select-none"
        data-suppress-trail
      >
        <SoundToggle className="ml-0 top-0" iconSize={20} rows={3} />
      </div>

      {/* Sosmed: kanan-bawah (satu kesatuan dengan action) */}
      <a
        ref={btnSocial}
        href="https://www.linkedin.com"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[12000] pointer-events-auto select-none"
        aria-label="LinkedIn"
        data-suppress-trail
      >
        <span className="relative inline-block align-middle" style={{ width: 44, height: 44 }}>
          <img src={sosmedSrc} alt="" className="absolute  w-full h-full" draggable={false} />
          <img src={linkedinSrc} alt="LinkedIn" className="absolute inset-0 m-auto w-[20px] h-[20px]" draggable={false} />
        </span>
      </a>
    </>
  );
}
