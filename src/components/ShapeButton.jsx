// components/ShapeButton.jsx
"use client";
import TransitionLink from "@/components/TransitionLink";
import React, { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

export default function ShapeButton({
  href,
  label,
  shapeSrc,
  active = false,
  className = "",
  onMouseEnter,
  onMouseLeave,
  // --- baru:
  outerRef,              // ref ke elemen wrapper (buat di-animate dari luar)
  disableAutoReveal = false, // matiin auto-reveal internal (kita animasi dari page.js)
  revealOrder = 0,       // kalau suatu saat mau dipakai lagi
}) {
  const shapeColor = active ? "#D3FB43" : "#222222";
  const textColor  = active ? "#222222" : "#D3FB43";

  const wrapRef = useRef(null);
  const pathname = usePathname();
  const VISITED_KEY = "mm:navRevealedOnce";

  // expose wrapper ke parent
  useLayoutEffect(() => {
    if (!outerRef) return;
    if (typeof outerRef === "function") outerRef(wrapRef.current);
    else outerRef.current = wrapRef.current;
  }, [outerRef]);

  // (opsional) auto-reveal internal — DIMATIKAN di homepage lewat prop
  useLayoutEffect(() => {
    if (disableAutoReveal) return;
    if (typeof window === "undefined") return;
    if (pathname !== "/") return;
    if (window.sessionStorage.getItem(VISITED_KEY) === "1") return;

    const el = wrapRef.current;
    if (!el) return;

    gsap.set(el, { y: 22, opacity: 0, willChange: "transform,opacity" });
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(el, {
      y: 0,
      opacity: 1,
      duration: 0.6,
      delay: revealOrder * 0.12,
      onComplete: () => gsap.set(el, { clearProps: "willChange" }),
    });
    window.sessionStorage.setItem(VISITED_KEY, "1");
    return () => tl.kill();
  }, [pathname, disableAutoReveal, revealOrder]);

  return (
    <div
      ref={wrapRef}
      className={`relative block shrink-0 leading-none ${className}`}
      style={{ width: 112, height: 44 }}
    >
      <TransitionLink
        href={href}
        className="absolute inset-0 block"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        data-hover-interactive
      >
        {/* SHAPE (masked) */}
        <div
          aria-hidden
          className="w-full h-full"
          style={{
            backgroundColor: shapeColor,
            WebkitMaskImage: `url(${shapeSrc})`,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            WebkitMaskPosition: "center",
            maskImage: `url(${shapeSrc})`,
            maskRepeat: "no-repeat",
            maskSize: "100% 100%",
            maskPosition: "center",
          }}
        />
        {/* LABEL */}
        <span
          className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-sm tracking-wide"
          style={{ color: textColor }}
        >
          {label}
        </span>
      </TransitionLink>
    </div>
  );
}
