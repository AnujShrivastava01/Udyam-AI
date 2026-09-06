"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

import { shouldPreventSmoothScroll } from "@/lib/scroll/prevent";

/**
 * Momentum scrolling, but only for users who have not asked for less motion.
 *
 * Lenis replaces the browser's own scroll physics. That is a taste decision for most visitors and a
 * usability failure for a visitor with a vestibular disorder, who has already told the platform so
 * via prefers-reduced-motion. CSS cannot switch off a requestAnimationFrame loop, so the check has
 * to live here — and it has to stay live, because the setting can change while the tab is open.
 *
 * ── Two ways this broke, both reported as "sometimes I cannot scroll" ────────────────────────
 *
 * STALE DIMENSIONS. Lenis measures the document once and then only on a window resize. The App
 * Router changes the whole page without ever firing one, so navigating from a short screen to a
 * long one left Lenis clamping the scroll to the previous page's height — the page simply stopped
 * moving part way down. A ResizeObserver on the body fixes it at the source: any content that
 * grows, from a route change to a scan result expanding a card, re-measures.
 *
 * HIJACKED INNER SCROLLERS. Lenis calls preventDefault on the wheel and drives the window itself,
 * which means a wheel over a scrollable panel — the repayment schedule, a select dropdown, the
 * voice transcript — scrolled the page behind it instead of the panel under the cursor. The
 * `prevent` predicate below hands the event back whenever the cursor is over something that
 * genuinely scrolls on its own, so new panels are covered without anyone remembering to tag them.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;
    let frame = 0;
    let observer: ResizeObserver | null = null;

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
        /**
         * Leave anything that scrolls itself alone.
         *
         * Lenis walks up from the event target and stops if this returns true. The explicit
         * attribute is honoured first so a container can opt out deliberately; otherwise the test
         * is behavioural — does this element actually have overflow to scroll — which covers every
         * panel in the app without a list to maintain.
         */
        prevent: (node) =>
          node instanceof HTMLElement &&
          shouldPreventSmoothScroll(node, getComputedStyle(node).overflowY),
      });

      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);

      // Re-measure whenever the document's height changes for any reason.
      observer = new ResizeObserver(() => lenis?.resize());
      observer.observe(document.body);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      observer = null;
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

  /**
   * A belt-and-braces re-measure on navigation.
   *
   * The observer above catches the height change, but a route whose content arrives across several
   * frames can settle after the observer has already fired. Two cheap resizes on the frames after
   * a route change cost nothing and close that window.
   */
  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    });
    return () => cancelAnimationFrame(raf1);
  }, [pathname]);

  return <>{children}</>;
}
