import { create } from "zustand";

/**
 * The README greeting's intro, a short motion graphic (see Greeting): the hero prompt types `whoami`,
 * then each phrase of `greetingIntro` decodes onto the canvas left to right and dissolves into the
 * next, until the greeting itself resolves. This holds where it's up to, for the prompt and the art.
 */
export const INTRO_COMMAND = "whoami";

type IntroState = {
  phase: "typing" | "playing" | "done";
  /** How much of INTRO_COMMAND the prompt shows while typing. */
  typed: number;
  /** Bumped on every (re)play, so the player restarts. */
  run: number;
  play: () => void;
  type: (typed: number) => void;
  start: () => void;
  finish: () => void;
};

export const useGreetingIntro = create<IntroState>((set) => ({
  phase: "done",
  typed: INTRO_COMMAND.length,
  run: 0,
  play: () => set((s) => ({ phase: "typing", typed: 0, run: s.run + 1 })),
  type: (typed) => set({ typed }),
  start: () => set({ phase: "playing", typed: INTRO_COMMAND.length }),
  finish: () => set({ phase: "done", typed: INTRO_COMMAND.length }),
}));

const TYPE_MS = 85; // per character of the command
const ENTER_MS = 300; // after typing, before the output
const IN_MS = 560; // a phrase decoding in
const HOLD_MS = 950;
const OUT_MS = 380; // a phrase dissolving away
const LAND_MS = 750; // the greeting decoding in, at the end
const FRAME_MS = 1000 / 30; // the noise redraws at 30fps, like an old terminal
const BAND = 12; // width of the decoding edge, in columns
const NOISE = "█▓▒░";

type Step = { kind: "in" | "hold" | "out"; scene: number; ms: number };

const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** The lettering as HTML: runs of ░ in the shade colour (as withShade does). Block glyphs only. */
const toHtml = (rows: string[]) => rows.join("\n").replace(/░+/g, (run) => `<span class="ascii-shade">${run}</span>`);

/** A phrase sweeping in: settled glyphs behind a ragged edge of noise, blank ahead of it. */
function decode(target: string[], p: number, jitter: number[]) {
  const cols = target[0].length;
  const filled = target.map((row) => [...row].findIndex((c) => c !== " ")).filter((i) => i >= 0);
  const left = filled.length ? Math.min(...filled) : 0;
  const right = Math.max(...target.map((row) => row.trimEnd().length));
  const front = left - BAND + p * (right - left + 2 * BAND);
  return target.map((row, r) => {
    let out = "";
    for (let x = 0; x < cols; x++) {
      const d = front + jitter[r] - x;
      const ch = row[x];
      out += d >= BAND ? ch : d < 0 ? " " : ch !== " " ? pick(NOISE) : Math.random() < 0.06 ? "░" : " ";
    }
    return out;
  });
}

/** A phrase breaking up: each cell flickers to shade at its own moment, then goes. */
function dissolve(from: string[], q: number, at: Float32Array) {
  const cols = from[0].length;
  return from.map((row, r) => {
    let out = "";
    for (let x = 0; x < cols; x++) {
      const t = q * 1.3 - at[r * cols + x];
      out += row[x] === " " || t < 0 ? row[x] : t < 0.3 ? pick("▒░") : " ";
    }
    return out;
  });
}

/**
 * Plays the intro into `el`: types the prompt, then the scenes (the last is the greeting, which
 * stays). Calls `done` at the end; `stop()` cancels it.
 */
export function playIntro(el: HTMLElement, scenes: string[][], done: () => void) {
  const cols = Math.max(...scenes.flat().map((l) => l.length));
  const grids = scenes.map((lines) => lines.map((l) => l.padEnd(cols)));
  const blank = grids[0].map(() => " ".repeat(cols));
  const steps: Step[] = grids.flatMap((_, scene): Step[] =>
    scene === grids.length - 1
      ? [{ kind: "in", scene, ms: LAND_MS }]
      : [
          { kind: "in", scene, ms: IN_MS },
          { kind: "hold", scene, ms: HOLD_MS },
          { kind: "out", scene, ms: OUT_MS },
        ],
  );
  const intro = useGreetingIntro.getState();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let raf = 0;
  let elapsed = 0;
  let last = 0;
  let drawnAt = -Infinity;
  let current = -1;
  let jitter: number[] = [];
  let thresholds = new Float32Array(0);

  el.innerHTML = toHtml(blank);
  useGreetingIntro.setState({ phase: "typing", typed: 0 });

  const frame = (now: number) => {
    // Clamp the step, so a backgrounded tab resumes where it left off rather than skipping ahead.
    elapsed += Math.min(50, now - (last || now));
    last = now;
    let t = elapsed;
    let i = 0;
    while (i < steps.length && t >= steps[i].ms) t -= steps[i++].ms;
    if (i === steps.length) {
      el.innerHTML = toHtml(grids[grids.length - 1]);
      done();
      return;
    }
    const step = steps[i];
    if (i !== current) {
      current = i;
      drawnAt = -Infinity;
      jitter = grids[0].map(() => Math.random() * 5);
      thresholds = Float32Array.from({ length: grids[0].length * cols }, () => Math.random());
    }
    if (step.kind !== "hold" ? elapsed - drawnAt >= FRAME_MS : drawnAt === -Infinity) {
      drawnAt = elapsed;
      const grid = grids[step.scene];
      const p = easeInOut(Math.min(1, t / step.ms));
      el.innerHTML = toHtml(step.kind === "in" ? decode(grid, p, jitter) : step.kind === "out" ? dissolve(grid, p, thresholds) : grid);
    }
    raf = requestAnimationFrame(frame);
  };

  // `whoami`, a beat, then its output.
  const typeNext = (n: number) => {
    timer = setTimeout(
      () => {
        if (n <= INTRO_COMMAND.length) {
          intro.type(n);
          typeNext(n + 1);
        } else {
          intro.start();
          raf = requestAnimationFrame(frame);
        }
      },
      n <= INTRO_COMMAND.length ? TYPE_MS : ENTER_MS,
    );
  };
  // A beat on the empty prompt first, so the typing reads as typing.
  timer = setTimeout(() => typeNext(1), 450);

  return {
    stop() {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    },
  };
}
