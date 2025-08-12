// components/IntroOverlay.jsx
"use client";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

export default function IntroOverlay({ onDone }) {
  const wrapRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  useLayoutEffect(() => {
    gsap.ticker.fps(60);

    const ctx = gsap.context(() => {
      const wrap = wrapRef.current;
      const L = leftRef.current;
      const R = rightRef.current;

      // Initial: both centered
      gsap.set([L, R], {
        position: "fixed",
        top: "50%",
        left: "50%",
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: 0,
        scale: 0.96,
        willChange: "transform",
      });

      const tl = gsap.timeline({
        defaults: { ease: "power3.out", force3D: true },
        onComplete: () => {
          gsap.set(wrap, { autoAlpha: 0, display: "none" });
          onDone?.();
        },
      });

      // Small pop
      tl.to([L, R], { duration: 0.4, scale: 1, ease: "back.out(1.6)", stagger: 0.06 })
        .to({}, { duration: 0.15 });

      // Slide to FINAL positions (no measuring; stable)
      // Left label → left: 2.5rem, keep top center
      tl.to(L, {
        duration: 0.6,
        xPercent: 0,
        x: "-calc(50vw - 2.5rem)",   // from center to 2.5rem from left
        y: 0,                         // keep vertical center (we already use yPercent:-50)
        ease: "expo.out",
        overwrite: "auto",
      }, "<");

      // Right label → right: 2.5rem  (convert to left-based move)
      tl.to(R, {
        duration: 0.6,
        xPercent: 0,
        // centerX → target at (viewportWidth - 2.5rem)
        x: "calc(50vw - 2.5rem)",
        y: 0,
        ease: "expo.out",
        overwrite: "auto",
      }, "<");

      // Fade overlay away
      tl.to(wrap, { duration: 0.3, opacity: 0, pointerEvents: "none" }, "+=0.05");
    }, wrapRef);

    return () => ctx.revert();
  }, [onDone]);

  return (
    <div ref={wrapRef} className="fixed inset-0 z-[80] bg-[#f8f8f8] text-black font-mono">
      <span ref={leftRef} className="text-sm select-none">MANAMONA</span>
      <span ref={rightRef} className="text-sm select-none">2025</span>
    </div>
  );
}
