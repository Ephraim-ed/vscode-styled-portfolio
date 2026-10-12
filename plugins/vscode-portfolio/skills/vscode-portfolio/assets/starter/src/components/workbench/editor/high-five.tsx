"use client";

import { useRef, useState, type CSSProperties } from "react";

import { greetingHand } from "@/data/greeting";
import { chime, clap } from "@/lib/sounds";
import { RAIN_AT, SHUTDOWN_AT, SNOW_AT, useWeather } from "@/lib/weather";

import { withShade } from "./ascii-shade";

/** An open hand in pixels (thumb on the left, so it meets the greeting's hand palm to palm). */
const CURSOR_HAND = [
  "......##......",
  "...##.##.##...",
  "...##.##.##...",
  "...##.##.##.##",
  "...##.##.##.##",
  "...##.##.##.##",
  "...###########",
  "##.###########",
  "##############",
  ".#############",
  "..############",
  "...##########.",
  "....########..",
  ".....######...",
];

/**
 * A 32×32 cursor: the hand in white with a black outline (readable on any theme), 2px per pixel.
 * `pressed` draws it a little smaller, as if pushed into the screen.
 */
function handCursor(pressed: boolean) {
  const filled = (x: number, y: number) => CURSOR_HAND[y]?.[x] === "#";
  let fill = "";
  let outline = "";
  for (let y = -1; y <= CURSOR_HAND.length; y++) {
    for (let x = -1; x <= CURSOR_HAND[0].length; x++) {
      const cell = `M${(x + 1) * 2} ${(y + 1) * 2}h2v2h-2z`;
      if (filled(x, y)) fill += cell;
      else if ([-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => filled(x + dx, y + dy)))) outline += cell;
    }
  }
  const scale = pressed ? ' transform="translate(16 17) scale(.86) translate(-16 -17)"' : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">` +
    `<g${scale}><path fill="#000" d="${outline}"/><path fill="#fff" d="${fill}"/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 17, ${pressed ? "grabbing" : "grab"}`;
}

const cursors = { "--hand-cursor": handCursor(false), "--hand-cursor-pressed": handCursor(true) };

const CHEERS = ["High five!", "Up top!", "Nice one!", "Boom!", "Again!"];
const RAYS = 8;

type Burst = { id: number; x: number; y: number; text: string };

/** The cheer for the nth high five; the ones that change the weather get their own. */
const cheerFor = (n: number) =>
  n === RAIN_AT
    ? "Make it rain!"
    : n === SNOW_AT
      ? "Let it snow!"
      : n === SHUTDOWN_AT
        ? "Uh oh…"
        : CHEERS[(n - 1) % CHEERS.length];

/**
 * The greeting's waving hand, as a button: hovering stills it (and the cursor turns into a hand),
 * clicking or tapping it is a high five — it slaps forward, with impact lines and a cheer where
 * the hands met, and a clap (lib/sounds.ts). Works from the keyboard too. Enough of them change the
 * README's weather (lib/weather.ts), with a chime; too many shut the whole site down (Shutdown).
 */
export function HighFiveHand() {
  const ref = useRef<HTMLButtonElement>(null);
  const [still, setStill] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [cheer, setCheer] = useState("");

  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Ease back upright from wherever the wave was, rather than snapping.
  const settle = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const current = getComputedStyle(el).transform;
    setStill(true);
    if (current !== "none" && !reducedMotion()) {
      el.animate([{ transform: current }, { transform: "none" }], { duration: 180, easing: "ease-out" });
    }
  };

  /** `at` is where the hands met (a click on the hand); otherwise the middle of the palm. */
  const highFive = (at?: { clientX: number; clientY: number }) => {
    const el = ref.current;
    const art = el?.offsetParent;
    if (!el || !art) return;
    const box = art.getBoundingClientRect();
    const hand = el.getBoundingClientRect();
    const x = (at ? at.clientX : hand.left + hand.width / 2) - box.left;
    const y = (at ? at.clientY : hand.top + hand.height * 0.55) - box.top;
    const n = useWeather.getState().highFive();
    const text = cheerFor(n);
    clap();
    if (n === RAIN_AT || n === SNOW_AT) chime();
    setBursts((list) => [...list, { id: n, x, y, text }]);
    setCheer(text);
    if (!reducedMotion()) {
      el.animate(
        [
          { transform: "none" },
          { transform: "scale(1.16) rotate(-5deg)", offset: 0.22 },
          { transform: "scale(0.95) rotate(3deg)", offset: 0.5 },
          { transform: "scale(1.03) rotate(-1deg)", offset: 0.75 },
          { transform: "none" },
        ],
        { duration: 460, easing: "ease-out" },
      );
    }
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label="High five"
        onPointerEnter={settle}
        onPointerLeave={() => setStill(false)}
        onClick={(e) => highFive(e.detail === 0 ? undefined : e)}
        className={still ? "ascii-wave high-five is-still" : "ascii-wave high-five"}
        style={{ left: `${greetingHand.col}ch`, top: `${greetingHand.row}em`, ...cursors } as CSSProperties}
      >
        <span aria-hidden className="ascii-slices">
          {withShade(greetingHand.lines.join("\n"))}
        </span>
      </button>
      {bursts.map((b) => (
        <span key={b.id} aria-hidden className="high-five-burst" style={{ left: b.x, top: b.y }}>
          {Array.from({ length: RAYS }, (_, i) => (
            <span key={i} className="high-five-ray" style={{ "--angle": `${(360 / RAYS) * i - 90}deg` } as CSSProperties} />
          ))}
          <span
            className="high-five-text"
            onAnimationEnd={() => setBursts((list) => list.filter((other) => other.id !== b.id))}
          >
            {b.text}
          </span>
        </span>
      ))}
      <span className="sr-only" aria-live="polite">
        {cheer}
      </span>
    </>
  );
}

/** The greeting's hand without the high-five game (features.easterEggs off): it just waves. */
export function WavingHand() {
  return (
    <span
      aria-hidden
      className="ascii-wave"
      style={{ left: `${greetingHand.col}ch`, top: `${greetingHand.row}em` } as CSSProperties}
    >
      <span className="ascii-slices">{withShade(greetingHand.lines.join("\n"))}</span>
    </span>
  );
}
