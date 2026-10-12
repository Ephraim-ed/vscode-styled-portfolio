"use client";

import { useEffect, useRef, useState } from "react";

import { DinoGame, HEIGHT, MIN_WIDTH, type DinoColors } from "@/lib/dino/game";

const HIGH_SCORE_KEY = "portfolio:dino-high-score";
/** After a crash, ignore input briefly so a held key doesn't restart straight away. */
const RESTART_DELAY = 400;
/** After a crash, the demo takes over again if nobody restarts for this long. */
const BACK_TO_DEMO = 6000;

function readHighScore() {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // Storage blocked: the high score just won't survive a reload.
  }
}

function readColors(el: HTMLElement): DinoColors {
  const style = getComputedStyle(el);
  return {
    ink: style.getPropertyValue("--editor-foreground").trim() || style.color,
    faint: style.getPropertyValue("--description").trim() || style.color,
    accent: style.getPropertyValue("--ansi-green").trim() || style.color,
    background: style.getPropertyValue("--editor").trim() || "transparent",
    font: style.fontFamily,
  };
}

const JUMP_KEYS = new Set([" ", "ArrowUp", "w", "W"]);
const DUCK_KEYS = new Set(["ArrowDown", "s", "S"]);

/**
 * A runner game in the README preview, after Chrome's offline dinosaur but starring the site's pixel
 * pixel monogram. It runs itself (a demo on autopilot) until someone clicks, taps or presses Space, which
 * starts a fresh run; a few seconds after a game over the demo takes over again. Keys only count
 * while the game has focus (click or Tab to it), so Space still scrolls the page and the terminal
 * keeps its typing. With reduced motion there's no demo: it waits, still, for a first press.
 */
export function DinoRunner() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [touch, setTouch] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const el = wrap.current!;
    const cv = canvas.current!;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const coarse = window.matchMedia("(pointer: coarse)");
    setTouch(coarse.matches);
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const game = new DinoGame(readHighScore());
    if (!calm) game.startDemo();
    let colors = readColors(el);
    let scale = 1;
    let raf = 0;
    let last = 0;
    let overAt = 0;
    let visible = true;
    let demoTimer: ReturnType<typeof setTimeout> | undefined;
    const moving = () => (game.state === "running" || game.state === "demo") && visible && !document.hidden;

    const paint = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      game.draw(ctx, colors, coarse.matches ? "Tap" : "Click or press Space");
    };

    const frame = (t: number) => {
      // Clamp the step so a stalled tab doesn't teleport the dinosaur into a cactus.
      const dt = last ? Math.min(1 / 30, (t - last) / 1000) : 0;
      last = t;
      const wasRunning = game.state === "running";
      game.update(dt);
      paint();
      if (moving()) {
        raf = requestAnimationFrame(frame);
        return;
      }
      raf = 0;
      last = 0;
      if (wasRunning && game.state === "over") {
        overAt = performance.now();
        saveHighScore(game.highScore);
        setAnnouncement(`Game over. Score ${Math.floor(game.score)}, high score ${game.highScore}.`);
        if (!calm) {
          demoTimer = setTimeout(() => {
            if (game.state !== "over") return;
            game.startDemo();
            run();
          }, BACK_TO_DEMO);
        }
      }
    };

    const run = () => {
      if (moving() && !raf) raf = requestAnimationFrame(frame);
      else if (!raf) paint();
    };

    const press = (action: "jump" | "duck") => {
      if (game.state === "over" && performance.now() - overAt < RESTART_DELAY) return;
      clearTimeout(demoTimer);
      if (game.state !== "running") setAnnouncement("");
      game.press(action);
      run();
    };
    const release = (action: "jump" | "duck") => game.release(action);
    const pause = () => {
      game.pause();
      paint();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (JUMP_KEYS.has(e.key) || DUCK_KEYS.has(e.key)) {
        e.preventDefault();
        if (!e.repeat) press(JUMP_KEYS.has(e.key) ? "jump" : "duck");
      } else if (e.key === "Escape" && game.state === "running") {
        pause();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (JUMP_KEYS.has(e.key)) release("jump");
      else if (DUCK_KEYS.has(e.key)) release("duck");
    };
    // The click itself focuses the game (tabIndex), which is what arms the keys.
    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary || e.button > 0) return;
      press("jump");
    };
    const onPointerUp = () => release("jump");

    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("keyup", onKeyUp);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("blur", pause);

    // Pause a run when it's scrolled away or the tab is hidden, so nobody loses one they can't see;
    // the demo simply stops drawing until it's back in view.
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) run();
      else pause();
    });
    visibility.observe(el);
    const onVisibility = () => (document.hidden ? pause() : run());
    document.addEventListener("visibilitychange", onVisibility);

    // The field runs the canvas's full width at 1 logical px per CSS px; narrower than MIN_WIDTH
    // (phones), the whole field scales down instead. The CSS height in globals.css matches.
    const resize = new ResizeObserver(() => {
      const width = cv.clientWidth;
      if (!width) return;
      const fit = Math.min(1, width / MIN_WIDTH);
      const dpr = window.devicePixelRatio || 1;
      game.resize(width / fit);
      cv.width = Math.round(width * dpr);
      cv.height = Math.round(HEIGHT * fit * dpr);
      scale = fit * dpr;
      paint();
    });
    resize.observe(cv);

    // Themes swap CSS variables on <html>; repaint in the new colours.
    const theme = new MutationObserver(() => {
      colors = readColors(el);
      paint();
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const onPointerType = () => {
      setTouch(coarse.matches);
      paint();
    };
    coarse.addEventListener("change", onPointerType);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(demoTimer);
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("blur", pause);
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      resize.disconnect();
      theme.disconnect();
      coarse.removeEventListener("change", onPointerType);
    };
  }, []);

  return (
    <figure className="md-dino">
      <div
        ref={wrap}
        tabIndex={0}
        role="application"
        aria-roledescription="game"
        aria-label="Runner game starring the pixel logo. Space or Up to jump, Down to duck."
        className="md-dino-stage"
      >
        <canvas ref={canvas} aria-hidden />
      </div>
      <figcaption className="md-dino-keys">
        {touch ? (
          <span>Tap the game to jump</span>
        ) : (
          <>
            <span>
              <kbd>Space</kbd> <kbd>↑</kbd> jump
            </span>
            <span>
              <kbd>↓</kbd> duck
            </span>
            <span>
              <kbd>Esc</kbd> pause
            </span>
          </>
        )}
      </figcaption>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </figure>
  );
}
