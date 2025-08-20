"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function RouteCurtainClient() {
  const ref = useRef(null);
  const tl = useRef(null);

  useEffect(() => {
    const el = ref.current;
    gsap.set(el, { autoAlpha: 0 });

    const show = () => {
      tl.current?.kill();
      tl.current = gsap.to(el, { autoAlpha: 1, duration: 0.16, ease: "power1.out" });
      // lock scroll saat curtain tampil
      document.documentElement.style.overscrollBehavior = "none";
      document.body.style.overflow = "hidden";
    };

    const hide = () => {
      tl.current?.kill();
      tl.current = gsap.to(el, {
        autoAlpha: 0,
        duration: 0.18,
        ease: "power1.out",
        onComplete: () => {
          document.documentElement.style.overscrollBehavior = "";
          document.body.style.overflow = "";
        },
      });
    };

    // Global events
    const onLeave = () => show();
    const onReady = () => hide();

    window.addEventListener("route:leaving", onLeave);
    window.addEventListener("route:ready", onReady);

    // Delegate click ke semua <a> internal → emit route:leaving lebih awal (tanpa block default)
    const onDocPointerDown = (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto:")) return;
      // left click tanpa modifier
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      window.dispatchEvent(new Event("route:leaving"));
    };

    document.addEventListener("pointerdown", onDocPointerDown, true);

    return () => {
      window.removeEventListener("route:leaving", onLeave);
      window.removeEventListener("route:ready", onReady);
      document.removeEventListener("pointerdown", onDocPointerDown, true);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[100000] bg-[#f8f8f8] pointer-events-none"
    />
  );
}
