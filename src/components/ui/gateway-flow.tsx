"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Gateway Flow — converging bezier paths with travelling particles.
 *
 * ── Why this is native canvas rather than the iframe original ────────────────────────────────
 * The reference implementation renders a full HTML document inside a sandboxed iframe and then
 * runs a "focus" script that hides everything in it except `#flow-canvas`. That document pulls
 * four CDNs — Tailwind's play script, GSAP, GSAP ScrollTrigger and Iconify — plus three
 * third-party avatar images, none of which survive the focus pass. What is actually drawn is
 * plain 2D canvas with no dependencies at all.
 *
 * That matters here more than it usually would. This app is aimed at rural users on weak
 * connections and is submitted to a ministry; a landing page whose hero blocks on four external
 * scripts degrades to a blank rectangle on the connection it is meant to serve, and ships
 * requests to hosts that have nothing to do with the product. So the animation is ported
 * directly: same geometry, same motion, same click ripple, no iframe, no network, no fake avatars.
 *
 * The public shape is kept — same import path, same prop names — so the demo snippet still works.
 *
 * ── Accessibility and cost ──────────────────────────────────────────────────────────────────
 * `prefers-reduced-motion` renders one static frame instead of animating. The loop stops when the
 * canvas scrolls out of view, so a hero at the top of a long page is not burning a phone battery
 * while somebody reads the section below it.
 */

type FlowMode = "dark" | "light";
export type FlowModePreference = FlowMode | "auto";

export type GatewayFlowProps = {
  /** "auto" follows the app's own light/dark class and the OS preference. */
  mode?: FlowModePreference;
  speed?: number;
  size?: number;
  density?: number;
  strokeWidth?: number;
  opacity?: number;
  hue?: number;
  saturation?: number;
  brightness?: number;
  /** Ripple on click. Off by default: over an interactive hero it steals the pointer. */
  interactive?: boolean;
  /**
   * "converge" — every path runs from an edge into the centre (the original).
   * "gateway"  — paths run left edge to centre and centre to right edge, so the motion reads as
   *              something entering on one side and leaving on the other.
   */
  flow?: "converge" | "gateway";
  className?: string;
  style?: CSSProperties;
};

const DEFAULTS = {
  speed: 1,
  size: 1,
  density: 1,
  strokeWidth: 1,
  opacity: 1,
  hue: 0,
  saturation: 1,
  brightness: 1,
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function readAutoMode(): FlowMode {
  if (typeof document === "undefined") return "dark";
  const root = document.documentElement;
  // This app puts `.dark` on <html>; data-theme is honoured too so the component drops into
  // codebases that use either convention.
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  const declared = root.dataset.theme ?? root.dataset.scheme;
  if (declared === "light" || declared === "dark") return declared;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useResolvedMode(preference: FlowModePreference): FlowMode {
  /**
   * Seeded in the lazy initialiser, not from an effect.
   *
   * `readAutoMode` returns "dark" when there is no document, so the server and the first client
   * render agree — and nothing in the returned markup depends on this anyway. The mode only picks
   * the colours drawn imperatively onto a canvas that is `aria-hidden`, so there is no tree to
   * mismatch. Setting it from an effect body instead would cost a second render on every mount.
   */
  const [autoMode, setAutoMode] = useState<FlowMode>(readAutoMode);

  useEffect(() => {
    if (preference !== "auto") return;
    const update = () => setAutoMode(readAutoMode());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-scheme"],
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", update);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
    };
  }, [preference]);

  // Derived, never synced: an explicit mode needs no state at all.
  return preference === "auto" ? autoMode : preference;
}

interface Particle {
  t: number;
  speed: number;
}
interface Path {
  fromLeft: boolean;
  /** Gateway mode: false means the path leaves the centre towards the right edge. */
  outbound: boolean;
  startY: number;
  /** Where an outbound path lands on the right edge. */
  endY: number;
  particles: Particle[];
}
interface Ripple {
  x: number;
  y: number;
  radius: number;
  life: number;
}

export default function GatewayFlow({
  mode = "auto",
  speed = DEFAULTS.speed,
  size = DEFAULTS.size,
  density = DEFAULTS.density,
  strokeWidth = DEFAULTS.strokeWidth,
  opacity = DEFAULTS.opacity,
  hue = DEFAULTS.hue,
  saturation = DEFAULTS.saturation,
  brightness = DEFAULTS.brightness,
  interactive = false,
  flow = "converge",
  className,
  style,
}: GatewayFlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resolved = useResolvedMode(mode);

  // Read through a ref inside the animation loop so changing a knob adjusts the next frame rather
  // than tearing down the paths and restarting the motion. Written in an effect, not during
  // render — a ref mutated while rendering is torn by concurrent rendering.
  const knobs = useRef({ speed, size, density, strokeWidth, mode: resolved, interactive, flow });
  useEffect(() => {
    knobs.current = { speed, size, density, strokeWidth, mode: resolved, interactive, flow };
  }, [speed, size, density, strokeWidth, resolved, interactive, flow]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let paths: Path[] = [];
    let ripples: Ripple[] = [];

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    function build() {
      const count = Math.max(12, Math.round(80 * clamp(knobs.current.density, 0.25, 2.5)));
      const gateway = knobs.current.flow === "gateway";
      paths = Array.from({ length: count }, (_, i) => ({
        // Converge: alternate edges, everything inbound. Gateway: the left half feeds the centre
        // and the right half leaves it, so the eye reads left -> middle -> right.
        fromLeft: gateway ? true : i % 2 === 0,
        outbound: gateway ? i % 2 === 1 : false,
        startY: (i / count) * height * 1.4 - height * 0.2,
        endY: ((i + 0.5) / count) * height * 1.4 - height * 0.2,
        particles: [{ t: Math.random(), speed: 0.0015 + Math.random() * 0.002 }],
      }));
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // 3x on a flagship is wasted fill rate
      const rect = canvas!.getBoundingClientRect();
      const nextW = rect.width;
      const nextH = rect.height;
      if (nextW < 1 || nextH < 1) return;

      /**
       * Rebuild the paths only when the size really moved.
       *
       * On a phone, showing and hiding the URL bar fires a resize for a few pixels of height on
       * every scroll — and `build()` regenerates every path with fresh random particle positions,
       * so the animation visibly restarts each time. The canvas backing store still follows the
       * box exactly; it is only the path geometry that is held steady.
       */
      const changedALot = Math.abs(nextW - width) > 2 || Math.abs(nextH - height) > 24;
      width = nextW;
      height = nextH;
      canvas!.width = Math.max(1, Math.round(width * dpr));
      canvas!.height = Math.max(1, Math.round(height * dpr));
      // Setting width/height resets the context, so the transform is reapplied every time.
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (changedALot || paths.length === 0) build();
    }

    function bezier(t: number, p0: DOMPoint, p1: DOMPoint, p2: DOMPoint, p3: DOMPoint) {
      const u = 1 - t;
      return {
        x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
        y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
      };
    }

    function render() {
      const { mode: m, size: sz, speed: sp, strokeWidth: sw } = knobs.current;
      const line = m === "light" ? "rgba(26, 31, 42, 0.40)" : "rgba(255, 255, 255, 0.35)";
      const dotColour = m === "light" ? "rgba(26, 31, 42, 0.75)" : "rgba(255, 255, 255, 0.70)";

      ctx!.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;

      if (!reduceMotion) {
        for (const r of ripples) {
          r.radius += 15;
          r.life -= 0.015;
        }
        ripples = ripples.filter((r) => r.life > 0);
      }

      ctx!.lineWidth = 1.2 * clamp(sz, 0.05, 8) * clamp(sw, 0.25, 8);
      ctx!.strokeStyle = line;

      for (const path of paths) {
        // An outbound path is the inbound curve mirrored: it starts at the centre and fans out to
        // the right edge, so a particle appears to pass through the middle and continue.
        const p0 = path.outbound
          ? new DOMPoint(cx, cy)
          : new DOMPoint(path.fromLeft ? 0 : width, path.startY);
        const p1 = path.outbound
          ? new DOMPoint(width - cx * 0.8, cy)
          : new DOMPoint(path.fromLeft ? cx * 0.5 : width - cx * 0.5, path.startY);
        const p2 = path.outbound
          ? new DOMPoint(width - cx * 0.5, path.endY)
          : new DOMPoint(path.fromLeft ? cx * 0.8 : width - cx * 0.8, cy);
        const p3 = path.outbound ? new DOMPoint(width, path.endY) : new DOMPoint(cx, cy);

        ctx!.beginPath();
        ctx!.moveTo(p0.x, p0.y);
        ctx!.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        ctx!.setLineDash([1, 4]);
        ctx!.stroke();
        ctx!.setLineDash([]);

        ctx!.fillStyle = dotColour;
        for (const particle of path.particles) {
          if (!reduceMotion) {
            particle.t += particle.speed * clamp(sp, 0, 3);
            if (particle.t > 1) {
              particle.t = 0;
              // A small random walk on the endpoints, so the fan never settles into a fixed
              // pattern. Outbound paths walk the edge they land on rather than the one they left.
              if (path.outbound) path.endY += (Math.random() - 0.5) * 10;
              else path.startY += (Math.random() - 0.5) * 10;
            }
          }
          const pos = bezier(particle.t, p0, p1, p2, p3);

          let dx = 0;
          let dy = 0;
          for (const r of ripples) {
            const ox = pos.x - r.x;
            const oy = pos.y - r.y;
            const dist = Math.hypot(ox, oy);
            // Only the shell of the ripple pushes — inside and outside it, the particle is still.
            if (dist > 0 && Math.abs(dist - r.radius) < 120) {
              const force = (1 - Math.abs(dist - r.radius) / 120) * r.life;
              dx += (ox / dist) * force * 80;
              dy += (oy / dist) * force * 80;
            }
          }
          ctx!.fillRect(pos.x + dx - 1.5, pos.y + dy - 1.5, 3, 3);
        }
      }

      // One frame is the whole job when motion is reduced, and there is nothing to animate once
      // the hero has scrolled away.
      if (!reduceMotion && visible) frame = requestAnimationFrame(render);
    }

    function onClick(e: MouseEvent) {
      if (!knobs.current.interactive) return;
      const rect = canvas!.getBoundingClientRect();
      ripples.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, radius: 0, life: 1 });
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !reduceMotion) {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(render);
        }
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    resize();
    render();
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      ro.disconnect();
      canvas.removeEventListener("click", onClick);
    };
    // Rebuilt only when the palette flips; every other knob is read live through the ref.
  }, [resolved]);

  const filter =
    hue === 0 && saturation === 1 && brightness === 1
      ? undefined
      : `hue-rotate(${hue}deg) saturate(${saturation}) brightness(${brightness})`;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        opacity: clamp(opacity, 0.05, 1),
        filter,
        pointerEvents: interactive ? "auto" : "none",
        ...style,
      }}
    />
  );
}
