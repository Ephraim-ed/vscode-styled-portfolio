import { CELL, PIXEL, SHADES, SPRITES, spriteSize, type SpriteName } from "./sprites";

/**
 * The README's endless runner, after Chrome's offline dinosaur game but starring the site's pixel
 * pixel monogram: jump the cacti and low birds, run under the high ones, and it speeds up as you go.
 * Until someone plays, it runs itself in a demo (an autopilot at a calm, steady pace). Plain state + update(dt) + draw(ctx); the React component owns
 * the loop, input, sizing and storage. Everything is in logical px on a `width` × HEIGHT field: the
 * field stretches to fill a wide editor, and phones scale the minimum width down to fit.
 */

export const MIN_WIDTH = 600;
export const HEIGHT = 150;

const GROUND = 134; // where feet and cacti rest
const RUNNER_X = 24;
/** The runner's letters stand on the ground; their dotted shadow drops one logo pixel below it. */
const SHADOW_DROP = CELL * PIXEL;
/** Width of the runner's letters (the shadow column on their left never collides). */
const RUNNER_W = spriteSize("evStand").w - CELL * PIXEL;
const GRAVITY = 2300; // px/s²
const JUMP_VELOCITY = -640; // ~89px high
const DROP_VELOCITY = -280; // letting go early cuts the jump short…
const MIN_JUMP = 30; // …but never below this height
const FAST_FALL = 3600; // extra gravity while holding ↓ in the air
const START_SPEED = 360; // px/s
const MAX_SPEED = 780;
const ACCELERATION = 4; // px/s²
const SCORE_PER_PX = 0.025;
const BIRD_MIN_SPEED = 510;
/** The demo's steady pace (no speed-up, so no birds either: just a calm run over the cacti). */
const DEMO_SPEED = 420;
/** Air time of a full jump, so gaps always leave room to land and take off again. */
const AIR_TIME = (2 * -JUMP_VELOCITY) / GRAVITY;

type ObstacleKind = "cactusSmall" | "cactusLarge" | "bird";

type Obstacle = {
  kind: ObstacleKind;
  x: number;
  y: number;
  count: number;
  w: number;
  /** Distance to keep clear behind this one before the next spawns. */
  gap: number;
  /** Birds fly a little faster or slower than the ground scrolls. */
  drift: number;
};

type Cloud = { x: number; y: number };
type Pebble = { x: number; y: number; w: number };

export type GameState = "idle" | "demo" | "running" | "paused" | "over";

export type DinoColors = { ink: string; faint: string; accent: string; background: string; font: string };

const paths = new Map<string, Path2D>();

/** A sprite layer as one path (a rect per run of pixels), so it fills without seams at any scale. */
function layerPath(key: string, rows: readonly string[]) {
  let path = paths.get(key);
  if (!path) {
    path = new Path2D();
    const p = path;
    rows.forEach((row, y) => {
      for (const run of row.matchAll(/#+/g)) p.rect(run.index, y, run[0].length, 1);
    });
    paths.set(key, path);
  }
  return path;
}
const spritePath = (name: SpriteName) => layerPath(name, SPRITES[name]);

function filled(name: SpriteName, x: number, y: number, px: number, py: number) {
  const row = SPRITES[name][Math.floor((py - y) / PIXEL)];
  return row?.[Math.floor((px - x) / PIXEL)] === "#";
}

type Placed = { name: SpriteName; x: number; y: number };

/** Pixel-exact overlap, sampled at logical-pixel centres inside the boxes' intersection. */
function collides(a: Placed, b: Placed) {
  const as = spriteSize(a.name);
  const bs = spriteSize(b.name);
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + as.w, b.x + bs.w);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + as.h, b.y + bs.h);
  for (let py = Math.floor(top) + 0.5; py < bottom; py++) {
    for (let px = Math.floor(left) + 0.5; px < right; px++) {
      if (filled(a.name, a.x, a.y, px, py) && filled(b.name, b.x, b.y, px, py)) return true;
    }
  }
  return false;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

export class DinoGame {
  state: GameState = "idle";
  score = 0;
  highScore: number;
  /** Field width in logical px (at least MIN_WIDTH). */
  width = MIN_WIDTH;

  private time = 0;
  private speed = START_SPEED;
  private y = GROUND; // feet
  private vy = 0;
  private jumpHeld = false;
  private ducking = false;
  private obstacles: Obstacle[] = [];
  private clouds: Cloud[] = [];
  private pebbles: Pebble[] = [];
  private flashUntil = 0;
  private flashScore = 0;

  constructor(highScore = 0) {
    this.highScore = highScore;
    this.reset();
  }

  private reset() {
    this.time = 0;
    this.score = 0;
    this.speed = START_SPEED;
    this.y = GROUND;
    this.vy = 0;
    this.obstacles = [];
    this.flashUntil = 0;
    this.clouds = [{ x: 140, y: 30 }, { x: 420, y: 52 }];
    this.scatterPebbles();
  }

  /** Called when the canvas changes size; the run carries on across the new width. */
  resize(width: number) {
    const next = Math.max(MIN_WIDTH, Math.round(width));
    if (next === this.width) return;
    this.width = next;
    this.scatterPebbles();
  }

  private scatterPebbles() {
    const count = Math.round(this.width / 21);
    this.pebbles = Array.from({ length: count }, (_, i) => ({
      x: (i / count) * this.width + rand(0, 20),
      y: GROUND + rand(2, 12),
      w: pick([1, 2, 2, 3, 4]),
    }));
  }

  private get airborne() {
    return this.y < GROUND;
  }

  /** The self-running demo: a fresh field, the autopilot at the wheel. */
  startDemo() {
    this.reset();
    this.speed = DEMO_SPEED;
    this.jumpHeld = this.ducking = false;
    this.state = "demo";
  }

  /**
   * The demo's driver: jump whatever's coming (except birds flying high enough to run under) once
   * it reaches the runner, and hold the jump until it's cleared. The same rule never crashed in 200
   * simulated four-minute runs at full speed.
   */
  private autopilot() {
    const front = RUNNER_X + SHADOW_DROP + RUNNER_W;
    const next = this.obstacles.find((o) => o.x + o.w > RUNNER_X);
    if (!next) return;
    const dist = next.x - front;
    const runUnder = next.kind === "bird" && next.y <= GROUND - 84;
    if (!runUnder && !this.airborne && dist < this.speed * 0.16 + 10 && dist > -next.w) {
      this.jumpHeld = true;
      this.vy = JUMP_VELOCITY;
    }
    if (this.airborne && dist < -next.w - 30) this.jumpHeld = false;
  }

  /** Space/↑/tap: ends the demo with a fresh run, or starts, resumes, restarts, or jumps. */
  press(action: "jump" | "duck") {
    if (this.state === "demo") {
      this.reset();
      this.state = "running";
    }
    if (this.state === "paused") return void (this.state = "running");
    if (action === "duck") {
      this.ducking = true;
      return;
    }
    this.jumpHeld = true;
    if (this.state === "idle" || this.state === "over") {
      if (this.state === "over") this.reset();
      this.state = "running";
    }
    if (!this.airborne && !this.ducking) this.vy = JUMP_VELOCITY;
  }

  release(action: "jump" | "duck") {
    if (action === "duck") this.ducking = false;
    else this.jumpHeld = false;
  }

  pause() {
    if (this.state === "running") this.state = "paused";
    this.jumpHeld = this.ducking = false;
  }

  update(dt: number) {
    if (this.state !== "running" && this.state !== "demo") return;
    const demo = this.state === "demo";
    this.time += dt;
    if (demo) this.autopilot();
    else this.speed = Math.min(MAX_SPEED, this.speed + ACCELERATION * dt);

    // The runner: gravity, short hops when the key is let go early, fast fall when ducking.
    if (this.airborne || this.vy < 0) {
      const height = GROUND - this.y;
      if (!this.jumpHeld && this.vy < DROP_VELOCITY && height > MIN_JUMP) this.vy = DROP_VELOCITY;
      this.vy += (GRAVITY + (this.ducking ? FAST_FALL : 0)) * dt;
      this.y = Math.min(GROUND, this.y + this.vy * dt);
      if (this.y >= GROUND) this.vy = 0;
    }

    const step = this.speed * dt;
    for (const o of this.obstacles) o.x -= step + o.drift * dt;
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > -10);
    // Obstacles hold off for the first second so a run never opens on a cactus.
    const last = this.obstacles.at(-1);
    if (this.time > 1 && (!last || last.x + last.w + last.gap < this.width)) this.spawn();

    for (const c of this.clouds) c.x -= (20 + this.speed * 0.08) * dt;
    this.clouds = this.clouds.filter((c) => c.x > -50);
    const cloud = this.clouds.at(-1);
    if (!cloud || cloud.x < this.width - rand(140, 400)) this.clouds.push({ x: this.width + 4, y: rand(14, 64) });

    for (const p of this.pebbles) {
      p.x -= step;
      if (p.x + p.w < 0) {
        p.x += this.width + rand(0, 30);
        p.y = GROUND + rand(2, 12);
      }
    }

    if (!demo) {
      const before = Math.floor(this.score / 100);
      this.score += step * SCORE_PER_PX;
      if (Math.floor(this.score / 100) > before) {
        this.flashScore = Math.floor(this.score / 100) * 100;
        this.flashUntil = this.time + 0.75;
      }
    }

    const runner = this.runnerSprite();
    const hit = this.obstacles.some((o) => this.placed(o).some((part) => collides(runner, part)));
    if (hit && demo) {
      this.startDemo(); // the autopilot shouldn't crash; if it ever does, quietly start over
    } else if (hit) {
      this.state = "over";
      this.jumpHeld = this.ducking = false;
      this.highScore = Math.max(this.highScore, Math.floor(this.score));
    }
  }

  private spawn() {
    const birds = this.speed >= BIRD_MIN_SPEED;
    const kind: ObstacleKind = birds && Math.random() < 0.25 ? "bird" : pick(["cactusSmall", "cactusLarge"] as const);
    const last = this.obstacles.at(-1);
    // Never two birds in a row: a low one then a high one can be impossible.
    if (kind === "bird" && last?.kind === "bird") return this.spawnCactus();
    if (kind === "bird") {
      const w = spriteSize("birdUp").w;
      // Low: jump it. High: run underneath (and mind it mid-jump). The runner is too short for a
      // fair duck-under height, so there's no middle one.
      const y = pick([GROUND - 34, GROUND - 84]);
      this.obstacles.push({ kind, x: this.width, y, count: 1, w, gap: this.gapAfter(w), drift: rand(-48, 48) });
      return;
    }
    this.spawnCactus(kind);
  }

  private spawnCactus(kind: "cactusSmall" | "cactusLarge" = pick(["cactusSmall", "cactusLarge"] as const)) {
    const size = spriteSize(kind);
    const most = this.speed < 420 ? 1 : this.speed < 560 ? 2 : 3;
    const count = 1 + Math.floor(Math.random() * most);
    const w = size.w * count;
    this.obstacles.push({ kind, x: this.width, y: GROUND - size.h, count, w, gap: this.gapAfter(w), drift: 0 });
  }

  /**
   * Chrome's rule (wider and faster means further apart), floored at one full jump of runway plus
   * room for the runner's own width (it's wider than Chrome's dinosaur).
   */
  private gapAfter(width: number) {
    const min = Math.max(width * (this.speed / 60) + 72, this.speed * AIR_TIME + 24 + (RUNNER_W - 40));
    return rand(min, min * 1.5);
  }

  /** The obstacle as sprites on the field (a cactus group is several). */
  private placed(o: Obstacle): Placed[] {
    if (o.kind === "bird") {
      const up = Math.floor(this.time * 6) % 2 === 0;
      // The wing-down frame's body sits 3 rows lower in its sprite; line the bodies up.
      return [up ? { name: "birdUp", x: o.x, y: o.y } : { name: "birdDown", x: o.x, y: o.y + 3 * PIXEL }];
    }
    const w = spriteSize(o.kind).w;
    return Array.from({ length: o.count }, (_, i) => ({ name: o.kind as SpriteName, x: o.x + i * w, y: o.y }));
  }

  /** The pixel monogram: its letters hop in turn while running, squash when ducking, flip over on a crash. */
  private runnerSprite(): Placed {
    let name: SpriteName;
    if (this.state === "over") name = "evDead";
    else if (this.state === "idle" || this.airborne) name = "evStand";
    else {
      const frame = Math.floor(this.time * 10) % 2 === 0;
      name = this.ducking ? (frame ? "evDuck1" : "evDuck2") : frame ? "evRun1" : "evRun2";
    }
    return { name, x: RUNNER_X, y: this.y - spriteSize(name).h + SHADOW_DROP };
  }

  draw(ctx: CanvasRenderingContext2D, colors: DinoColors, hint: string) {
    const sprite = ({ name, x, y }: Placed) => {
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.scale(PIXEL, PIXEL);
      ctx.fill(spritePath(name));
      ctx.restore();
    };

    ctx.fillStyle = colors.faint;
    for (const c of this.clouds) sprite({ name: "cloud", x: c.x, y: c.y });
    ctx.fillRect(0, GROUND - 2, this.width, 1);
    for (const p of this.pebbles) ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, 1);

    ctx.fillStyle = colors.ink;
    for (const o of this.obstacles) this.placed(o).forEach(sprite);
    const runner = this.runnerSprite();
    const shade = SHADES[runner.name as keyof typeof SHADES];
    if (shade) {
      ctx.save();
      ctx.fillStyle = colors.accent;
      ctx.translate(Math.round(runner.x), Math.round(runner.y));
      ctx.scale(PIXEL, PIXEL);
      ctx.fill(layerPath(`${runner.name}:shade`, shade));
      ctx.restore();
    }
    sprite(runner);

    // Score, top right: "HI 00412  00087", blinking at each hundred.
    ctx.font = `12px ${colors.font}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "right";
    const pad = (n: number) => String(Math.floor(n)).padStart(5, "0");
    const flashing = this.time < this.flashUntil;
    const shown = flashing ? this.flashScore : this.score;
    if (this.state !== "idle" && this.state !== "demo" && (!flashing || Math.floor(this.time * 8) % 2 === 0)) {
      ctx.fillText(pad(shown), this.width - 8, 8);
    }
    if (this.highScore > 0) {
      ctx.fillStyle = colors.faint;
      ctx.fillText(`HI ${pad(this.highScore)}`, this.width - 8 - ctx.measureText("00000").width - 14, 8);
    }

    ctx.textAlign = "center";
    // Messages sit on a patch of background so a passing cloud can't strike through them.
    const message = (text: string, y: number, font: string, color: string) => {
      ctx.font = font;
      const w = ctx.measureText(text).width;
      ctx.fillStyle = colors.background;
      ctx.fillRect(this.width / 2 - w / 2 - 6, y - 3, w + 12, 20);
      ctx.fillStyle = color;
      ctx.fillText(text, this.width / 2, y);
    };
    if (this.state === "over") {
      message("G A M E   O V E R", 42, `bold 14px ${colors.font}`, colors.ink);
      this.drawRestart(ctx, this.width / 2, 82);
    } else if (this.state === "idle" || this.state === "paused" || this.state === "demo") {
      const text =
        this.state === "paused"
          ? `Paused · ${hint[0].toLowerCase()}${hint.slice(1)} to resume`
          : `${hint} to ${this.state === "demo" ? "play" : "start"}`;
      message(text, 52, `12px ${colors.font}`, colors.faint);
    }
  }

  private drawRestart(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 11, -Math.PI * 0.35, Math.PI * 1.45);
    ctx.stroke();
    // Arrowhead at the arc's start, pointing along it.
    const a = -Math.PI * 0.35;
    const tipX = x + Math.cos(a) * 11;
    const tipY = y + Math.sin(a) * 11;
    ctx.beginPath();
    ctx.moveTo(tipX + 6, tipY - 1);
    ctx.lineTo(tipX - 3, tipY - 7);
    ctx.lineTo(tipX - 1, tipY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
