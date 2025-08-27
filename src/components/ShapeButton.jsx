"use client";
import TransitionLink from "@/components/TransitionLink";
import React, { useRef } from "react";
import { useSfx } from "@/lib/sfx";

export default function ShapeButton({
  href,
  label,
  shapeSrc,
  active = false,
  className = "",
  onMouseEnter,
  onMouseLeave,
}) {
  const shapeColor = active ? "#D3FB43" : "#222222";
  const textColor  = active ? "#222222" : "#D3FB43";
  const wrapRef = useRef(null);

  const playHover = useSfx("/sfx/hover.mp3", { volume: 0.45, rate: [0.98, 1.05], throttleMs: 120 });
  const playClick = useSfx("/sfx/click.mp3", { volume: 0.6, rate: [0.98, 1.04], throttleMs: 120 });

  return (
    <div
      ref={wrapRef}
      className={`relative block shrink-0 leading-none ${className}`}
      style={{ width: 112, height: 44 }}
      data-navbtn
    >
      <TransitionLink
        href={href}
        className="absolute inset-0 block"
        onMouseEnter={(e) => { playHover(); onMouseEnter?.(e); }}
        onMouseLeave={(e) => onMouseLeave?.(e)}
        onPointerDown={() => playClick()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") playClick(); }}
        data-hover-interactive
      >
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
