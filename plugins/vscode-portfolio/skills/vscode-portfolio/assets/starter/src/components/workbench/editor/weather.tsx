"use client";

import { useEffect, useRef } from "react";

import { useWeather, type Weather } from "@/lib/weather";

type Drop = { x: number; y: number; len: number; speed: number; alpha: number };
type Flake = { x: number; y: number; size: number; speed: number; sway: number; phase: number; glyph: string; alpha: number };

const FLAKES = ["*", "*", "+", "·", "."];
const WIND = 0.18; // rain's horizontal drift per unit of fall
const SNOWBANK_MAX = 14; // px
const SNOWBANK_SECONDS = 40; // to build up fully

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Rain or snow behind the README preview, once enough high fives have happened (lib/weather.ts).
 * A canvas under the scrolling content: rain as thin slanted streaks, winter as drifting ASCII
 * flakes over a slowly building snowbank. When the weather turns, the old particles fall away
 * instead of respawning while the new ones arrive from the top.
 */
export function WeatherLayer() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const weather = useWeather((s) => s.weather);
  const current = useRef<Weather>(weather);
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    current.current = weather;
    wake.current();
  }, [weather]);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let drops: Drop[] = [];
    let flakes: Flake[] = [];
    let snowbank = 0;
    let raf = 0;
    let last = 0;
    let time = 0;
    let visible = true;
    let colors = { rain: "#888", snow: "#ccc", font: "monospace" };

    const readColors = () => {
      const style = getComputedStyle(cv);
      // White rain; on light themes white would vanish, so it falls in the muted text colour there.
      const light = document.documentElement.dataset.themeType === "light";
      colors = {
        rain: light ? style.getPropertyValue("--description").trim() || "#888" : "#ffffff",
        snow: style.getPropertyValue("--editor-foreground").trim() || "#ccc",
        font: getComputedStyle(cv).fontFamily,
      };
    };
    readColors();

    const area = () => width * height;
    const targetDrops = () => (current.current === "rain" ? Math.round(Math.min(220, Math.max(40, area() / 6500))) : 0);
    const targetFlakes = () => (current.current === "snow" ? Math.round(Math.min(140, Math.max(30, area() / 11000))) : 0);

    // New particles start above the top edge, spread out so they arrive over a second or two.
    const newDrop = (spread: number): Drop => ({
      x: rand(-height * WIND, width),
      y: -rand(0, spread),
      len: rand(9, 18),
      speed: rand(650, 950),
      alpha: rand(0.25, 0.5),
    });
    const newFlake = (spread: number): Flake => ({
      x: rand(0, width),
      y: -rand(10, spread),
      size: rand(9, 16),
      speed: rand(28, 70),
      sway: rand(8, 26),
      phase: rand(0, Math.PI * 2),
      glyph: FLAKES[Math.floor(Math.random() * FLAKES.length)],
      alpha: rand(0.35, 0.8),
    });

    const step = (dt: number) => {
      time += dt;
      // Top up to the current weather's count; anything from the old weather just falls away.
      while (drops.length < targetDrops()) drops.push(newDrop(height));
      while (flakes.length < targetFlakes()) flakes.push(newFlake(height * 0.8));
      const keepDrops = targetDrops();
      const keepFlakes = targetFlakes();

      drops = drops.filter((d, i) => {
        d.y += d.speed * dt;
        d.x += d.speed * WIND * dt;
        if (d.y - d.len <= height) return true;
        if (i >= keepDrops) return false;
        Object.assign(d, newDrop(height * 0.3));
        return true;
      });
      flakes = flakes.filter((f, i) => {
        f.y += f.speed * dt;
        if (f.y - f.size <= height) return true;
        if (i >= keepFlakes) return false;
        Object.assign(f, newFlake(40));
        return true;
      });
      if (current.current === "snow") snowbank = Math.min(SNOWBANK_MAX, snowbank + (SNOWBANK_MAX / SNOWBANK_SECONDS) * dt);
      else snowbank = Math.max(0, snowbank - 8 * dt);
    };

    const paint = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      const dpr = cv.width / Math.max(1, width);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.strokeStyle = colors.rain;
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      for (const d of drops) {
        ctx.globalAlpha = d.alpha;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * WIND, d.y - d.len);
        ctx.stroke();
      }

      ctx.fillStyle = colors.snow;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const f of flakes) {
        ctx.globalAlpha = f.alpha;
        ctx.font = `${f.size}px ${colors.font}`;
        ctx.fillText(f.glyph, f.x + Math.sin(time * 0.9 + f.phase) * f.sway, f.y);
      }

      // The snowbank: a soft, lumpy drift along the bottom of the pane.
      if (snowbank > 0.5) {
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 12) {
          const lump = Math.sin(x / 37) * 0.25 + Math.sin(x / 89 + 1.7) * 0.2;
          ctx.lineTo(x, height - snowbank * (0.75 + lump));
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const busy = () => current.current !== "clear" || drops.length > 0 || flakes.length > 0 || snowbank > 0.5;

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      step(dt);
      paint();
      if (busy() && visible && !document.hidden) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    wake.current = () => {
      if (reducedMotion) {
        // One still frame of the weather, no motion.
        drops = [];
        flakes = [];
        snowbank = current.current === "snow" ? SNOWBANK_MAX : 0;
        for (let i = 0; i < targetDrops(); i++) drops.push({ ...newDrop(0), y: rand(0, height) });
        for (let i = 0; i < targetFlakes(); i++) flakes.push({ ...newFlake(0), y: rand(0, height) });
        paint();
        return;
      }
      if (!raf && busy() && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const resize = new ResizeObserver(() => {
      const box = cv.getBoundingClientRect();
      width = box.width;
      height = box.height;
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(width * dpr);
      cv.height = Math.round(height * dpr);
      if (reducedMotion) wake.current();
      else paint();
    });
    resize.observe(cv);

    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake.current();
    });
    seen.observe(cv);
    const onVisibility = () => wake.current();
    document.addEventListener("visibilitychange", onVisibility);
    const theme = new MutationObserver(() => {
      readColors();
      paint();
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-theme-type"] });

    wake.current();
    return () => {
      cancelAnimationFrame(raf);
      wake.current = () => {};
      resize.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      theme.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      data-weather={weather}
      className="pointer-events-none absolute inset-0 size-full font-mono"
    />
  );
}
