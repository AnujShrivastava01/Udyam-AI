"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Momentum scrolling, but only for users who have not asked for less motion.
 *
 * Lenis replaces the browser's own scroll physics. That is a taste decision for most visitors and a
 * usability failure for a visitor with a vestibular disorder, who has already told the platform so
 * via prefers-reduced-motion. CSS cannot switch off a requestAnimationFrame loop, so the check has
 * to live here — and it has to stay live, because the setting can change while the tab is open.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;
    let frame = 0;

    const start = () => {
      if (lenis) return;
      lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
      });
      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      lenis?.destroy();
      lenis = null;
    };

    const apply = () => (query.matches ? stop() : start());
    apply();
    query.addEventListener("change", apply);

    return () => {
      query.removeEventListener("change", apply);
      stop();
    };
  }, []);

  return <>{children}</>;
}
