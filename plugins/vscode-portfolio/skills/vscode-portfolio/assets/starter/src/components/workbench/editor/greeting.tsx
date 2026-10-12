"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { features } from "@/data/profile";
import { greeting, greetingCanvas, greetingHand, greetingIntro, greetingLabel, greetingOpeners } from "@/data/greeting";
import { INTRO_COMMAND, playIntro, useGreetingIntro } from "@/lib/greeting-intro";

import { withShade } from "./ascii-shade";
import { HighFiveHand, WavingHand } from "./high-five";

/** The intro plays once per page load, the first time the README is shown; the prompt replays it. */
let autoplayed = false;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The greeting with the hand's cells blanked out; the hand is drawn on top so it can wave. */
function withoutHand(text: string) {
  const { row, col, lines } = greetingHand;
  return text
    .split("\n")
    .map((line, i) => {
      const hand = lines[i - row];
      return hand === undefined ? line : line.slice(0, col) + " ".repeat(hand.length) + line.slice(col + hand.length);
    })
    .join("\n");
}

// Padded out to the canvas, so the finished greeting takes exactly the room its intro did.
const lettering = withoutHand(greeting.join("\n"))
  .split("\n")
  .map((line) => line.padEnd(greetingCanvas.cols))
  .join("\n");

/** "Good morning!" (5am to noon), "Good afternoon!" (to 6pm) or "Good evening!", by the visitor's clock. */
function opener(hour = new Date().getHours()) {
  return greetingOpeners[hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "afternoon" : "evening"];
}

/**
 * The README greeting: "Hi, I am / <first name>" in block letters, beside a waving hand that's a
 * high-five button (HighFiveHand). The first time it's shown it plays its intro as a motion graphic
 * (lib/greeting-intro.ts): "Good morning!" (or afternoon, or evening, by the visitor's clock), then
 * "Welcome to my workspace", each decoding in and dissolving away, until the greeting lands and the
 * hand pops up. Clicking the art skips it; the prompt above (HeroPrompt) replays it. With reduced
 * motion it's just the greeting.
 */
export function Greeting() {
  const canvas = useRef<HTMLSpanElement>(null);
  const player = useRef<{ stop(): void } | null>(null);
  const phase = useGreetingIntro((s) => s.phase);
  const run = useGreetingIntro((s) => s.run);
  const [landed, setLanded] = useState(false);

  // Decided before paint, so the finished greeting never flashes up first. (Until this runs, the
  // inline script in the layout keeps the server-rendered greeting hidden.)
  useLayoutEffect(() => {
    delete document.documentElement.dataset.intro;
    if (autoplayed || reducedMotion()) return;
    autoplayed = true;
    useGreetingIntro.getState().play();
  }, []);

  // Runs the intro whenever it's (re)played, or restarts it if the README was left mid-way.
  useEffect(() => {
    const el = canvas.current;
    if (!run || !el) return;
    const land = () => {
      player.current?.stop();
      setLanded(true);
      useGreetingIntro.getState().finish();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && land();
    const scenes = [opener().lines, ...greetingIntro.map((s) => s.lines), lettering.split("\n")];
    player.current = playIntro(el, scenes, land);
    window.addEventListener("keydown", onKey);
    return () => {
      player.current?.stop();
      window.removeEventListener("keydown", onKey);
    };
  }, [run]);

  const skip = () => {
    player.current?.stop();
    setLanded(true);
    useGreetingIntro.getState().finish();
  };

  const style = { "--art-cols": greetingCanvas.cols, "--art-width": "100cqw" } as CSSProperties;
  // Keyed apart: the canvas's frames are drawn outside React, so the greeting must not reuse it.
  if (phase !== "done") {
    return (
      <span
        key="intro"
        className="ascii-art greeting is-playing relative"
        style={style}
        title="Click or press Esc to skip"
        onClick={skip}
      >
        <span ref={canvas} role="img" aria-label={greetingLabel} className="ascii-slices" />
      </span>
    );
  }
  // The hand is a button (a high five), so only the lettering is the image. Like its intro, it gets
  // the column's full width rather than the art's usual 520px.
  return (
    <span
      key="greeting"
      className={landed ? "ascii-art greeting is-landed relative" : "ascii-art greeting relative"}
      style={style}
    >
      <span role="img" aria-label={greetingLabel} className="ascii-slices">
        {withShade(lettering)}
      </span>
      {features.easterEggs ? <HighFiveHand /> : <WavingHand />}
    </span>
  );
}

/** "~/portfolio $ whoami" above the greeting: it types the command as the intro starts, and replays it. */
export function HeroPrompt() {
  const phase = useGreetingIntro((s) => s.phase);
  const typed = useGreetingIntro((s) => s.typed);
  return (
    <button
      type="button"
      className={phase === "typing" ? "md-hero-prompt is-typing" : "md-hero-prompt"}
      title="Replay the intro"
      aria-label="Replay the intro"
      onClick={() => useGreetingIntro.getState().play()}
    >
      <span className="md-hero-path">~/portfolio</span> $ <span className="md-hero-command">{INTRO_COMMAND.slice(0, typed)}</span>
      <span className="md-hero-caret" />
    </button>
  );
}
