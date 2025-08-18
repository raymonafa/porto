// components/Navbar.js
"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ShapeButton from "@/components/ShapeButton";

const ascii = ["⁕","※","⊙","∘","∀","9","1",">","-","6"];

export default function Navbar(){
  const pathname = usePathname();
  const originals = { manamona:"[MANAMONA]", works:"[WORKS]", who:"[WHO]" };
  const [labels, setLabels] = useState(originals);
  const iv = useRef({}), to = useRef({});

  const glitch = (t,p=0.45)=>t.split("").map(ch=>Math.random()<p?ascii[(Math.random()*ascii.length)|0]:ch).join("");
  const stop = k => { if(iv.current[k]) clearInterval(iv.current[k]); if(to.current[k]) clearTimeout(to.current[k]); iv.current[k]=to.current[k]=null; setLabels(v=>({...v,[k]:originals[k]})); };
  const start = (k,d=400)=>{ stop(k); iv.current[k]=setInterval(()=>setLabels(v=>({...v,[k]:glitch(originals[k])})),60); to.current[k]=setTimeout(()=>stop(k),d); };
  useEffect(()=>()=>{Object.values(iv.current).forEach(clearInterval);Object.values(to.current).forEach(clearTimeout);},[]);

  const isHome  = pathname === "/";
  const isWork  = pathname.startsWith("/work");
  const isAbout = pathname.startsWith("/about");

  return (
    <nav
      className="
        fixed bottom-6 left-1/2 -translate-x-1/2
        z-50 flex items-center gap-[2px]
        pointer-events-auto
      "
      data-suppress-trail
    >
      <ShapeButton
        href="/"
        label={labels.manamona}
        shapeSrc="/buttons/button1.svg"
        active={isHome}
        onMouseEnter={()=>start("manamona")}
        onMouseLeave={()=>stop("manamona")}
      />
      <ShapeButton
        href="/work"
        label={labels.works}
        shapeSrc="/buttons/button2.svg"
        active={isWork}
        onMouseEnter={()=>start("works")}
        onMouseLeave={()=>stop("works")}
      />
      <ShapeButton
        href="/about"
        label={labels.who}
        shapeSrc="/buttons/button3.svg"
        active={isAbout}
        onMouseEnter={()=>start("who")}
        onMouseLeave={()=>stop("who")}
      />
    </nav>
  );
}
