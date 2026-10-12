"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import { greeting, greetingLabel } from "@/data/greeting";
import { createGazePlayer, hasGaze, loadGazeSprite, portraitDimensions } from "@/lib/ascii-portrait";

import { Greeting } from "./greeting";

const EASE_MS = 120; // time constant of the follow
const REACH = 0.9; // the cursor reaches the extreme pose this many portrait-widths from its eyes
const IDLE_AFTER_MS = 4000; // touch screens go back to glancing around after this

/**
 * The README's ASCII art: the greeting (see Greeting), or the portrait. The portrait is
 * server-rendered as static text; once the gaze frames load, it looks at the pointer wherever it is
 * on the page, picking the nearest of the pre-rendered poses (real re-posed photos from `npm run
 * gaze`, not a warp). On touch screens it glances around until tapped. Respects
 * prefers-reduced-motion and pauses while off-screen.
 */
export function AsciiPortrait({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const cols = Math.max(...text.split("\n").map((l) => l.length));
  const isGreeting = text === greeting.join("\n");
  // Only the photo portrait (which has the rig's exact size) can follow the pointer.
  const isPortrait =
    text.split("\n").length === portraitDimensions.rows + (portraitDimensions.framed ? 2 : 0);

  useEffect(() => {
    const el = ref.current;
    const textNode = el?.firstChild;
    const expectedLines = portraitDimensions.rows + (portraitDimensions.framed ? 2 : 0);
    if (!hasGaze || !el || !(textNode instanceof Text) || text.split("\n").length !== expectedLines) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const gaze = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let frameAt: ((x: number, y: number) => string) | null = null;
    let raf = 0;
    let last = 0;
    let lastPointer = -Infinity;
    let onScreen = true;
    let disposed = false;

    const idle = (now: number) => (finePointer ? lastPointer === -Infinity : now - lastPointer > IDLE_AFTER_MS);

    const tick = (now: number) => {
      raf = 0;
      if (!frameAt) return;
      const dt = Math.min(64, now - (last || now));
      last = now;
      const glancing = idle(now);
      if (glancing) {
        // Slow, irregular glances around the room.
        const t = now / 1000;
        target.x = 0.7 * Math.sin(t * 0.45) * Math.cos(t * 0.17);
        target.y = 0.45 * Math.sin(t * 0.31 + 1.3);
      }
      const k = 1 - Math.exp(-dt / EASE_MS);
      gaze.x += (target.x - gaze.x) * k;
      gaze.y += (target.y - gaze.y) * k;
      const frame = frameAt(gaze.x, gaze.y);
      if (frame !== textNode.nodeValue) textNode.nodeValue = frame;
      const settled = Math.abs(target.x - gaze.x) < 0.005 && Math.abs(target.y - gaze.y) < 0.005;
      if (glancing || !settled) wake();
    };

    function wake() {
      if (!raf && frameAt && onScreen && !document.hidden) {
        raf = requestAnimationFrame((now) => {
          if (!last) last = now;
          tick(now);
        });
      }
    }

    const look = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      // Measured from the portrait's eyes, so it looks *at* the pointer, wherever it is on the page.
      const reach = box.width * REACH;
      target.x = Math.max(-1, Math.min(1, (e.clientX - (box.left + box.width / 2)) / reach));
      target.y = Math.max(-1, Math.min(1, (e.clientY - (box.top + box.height * 0.38)) / reach));
      lastPointer = performance.now();
      wake();
    };
    const onVisibility = () => {
      last = 0;
      wake();
    };

    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      last = 0;
      wake();
    });
    observer.observe(el);
    window.addEventListener("pointermove", look, { passive: true });
    window.addEventListener("pointerdown", look, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    loadGazeSprite()
      .then((sprite) => {
        if (disposed) return;
        frameAt = createGazePlayer(sprite);
        wake();
      })
      .catch(() => {}); // stays static

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", look);
      window.removeEventListener("pointerdown", look);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [text]);

  if (isGreeting) return <Greeting />;

  return (
    <span
      ref={ref}
      className="ascii-art relative"
      role="img"
      aria-label={isPortrait ? "ASCII art portrait that looks toward the pointer" : greetingLabel}
      style={{ "--art-cols": cols } as CSSProperties}
    >
      {text}
    </span>
  );
}
