import { create } from "zustand";

/**
 * The site's sounds, made live with the Web Audio API (no audio files):
 *   - a soft tick (12 ms of white noise through a 3.5 kHz high-pass) as the mouse moves onto anything
 *     clickable;
 *   - a clap for a high five with the greeting's hand, and a little chime when one changes the weather;
 *   - a power-down hum when too many shut the site down, and a power-up when it restarts.
 * Browsers only let sound start from a click or key press, so the first one sets the audio up and the
 * sounds begin after it. Visitors can mute them all (status bar, or the command palette); the choice is
 * remembered.
 */

const STORAGE_KEY = "portfolio:sounds";
const VOLUME = 0.3;
const GAP_MS = 45; // a fast sweep down a list shouldn't turn into a buzz

/** Things you can click: these tick when the mouse moves onto them. */
const CLICKABLE = 'a[href], button:not(:disabled), [role="button"], [role="tab"], [role="menuitem"], [role="option"], summary';

function readEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export const useSounds = create<{ enabled: boolean; toggle: () => void }>((set, get) => ({
  enabled: true,
  toggle: () => {
    const enabled = !get().enabled;
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch {
      // Storage blocked: the choice just won't survive a reload.
    }
    set({ enabled });
    if (enabled) tick({ force: true }); // so turning them on is heard
  },
}));

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let noise: AudioBuffer | null = null;
let lastTick = 0;

function unlock() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = VOLUME;
    out.connect(ctx.destination);
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.25), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
}

/** The audio graph's start, once unlocked and while sounds are on; null otherwise. */
function ready() {
  if (!ctx || !out || !noise || ctx.state === "closed" || !useSounds.getState().enabled) return null;
  return { ctx, out, noise, t: ctx.currentTime + 0.005 };
}

/** A gain that rises to `peak` in `attack` seconds and dies away over `decay`. */
function envelope(ctx: AudioContext, t: number, peak: number, attack: number, decay: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return gain;
}

/** The soft tick. Not within GAP_MS of the last one, unless forced. */
export function tick({ force = false } = {}) {
  const a = ready();
  if (!a) return;
  const now = performance.now();
  if (!force && now - lastTick < GAP_MS) return;
  lastTick = now;
  const src = a.ctx.createBufferSource();
  src.buffer = a.noise;
  const highPass = a.ctx.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = 3500;
  src.connect(highPass).connect(envelope(a.ctx, a.t, 0.55, 0.001, 0.011)).connect(a.out);
  src.start(a.t);
  src.stop(a.t + 0.02);
}

/** A hand clap: three quick bursts of band-passed noise (the palms meeting), the last with a short tail. */
export function clap() {
  const a = ready();
  if (!a) return;
  const bursts: [offset: number, peak: number, decay: number][] = [
    [0, 1.4, 0.008],
    [0.011, 1.2, 0.008],
    [0.022, 1.6, 0.13],
  ];
  for (const [offset, peak, decay] of bursts) {
    const t = a.t + offset;
    const src = a.ctx.createBufferSource();
    src.buffer = a.noise;
    const bandPass = a.ctx.createBiquadFilter();
    bandPass.type = "bandpass";
    bandPass.frequency.value = 1150;
    bandPass.Q.value = 0.8;
    src.connect(bandPass).connect(envelope(a.ctx, t, peak, 0.001, decay)).connect(a.out);
    src.start(t, Math.random() * 0.05); // a different stretch of the noise each time, so claps vary
    src.stop(t + decay + 0.02);
  }
}

/** A little rising chime (C6, E6, G6, C7), for a high five that changes the weather. */
export function chime() {
  const a = ready();
  if (!a) return;
  [1046.5, 1318.5, 1568, 2093].forEach((freq, i) => {
    const t = a.t + 0.12 + i * 0.07;
    const osc = a.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(envelope(a.ctx, t, 0.22, 0.004, 0.32)).connect(a.out);
    osc.start(t);
    osc.stop(t + 0.36);
  });
}

/** A sweep from `from` to `to` Hz over `seconds`, fading out: the site powering down or back up. */
function sweep(from: number, to: number, seconds: number, peak: number, type: OscillatorType = "sine") {
  const a = ready();
  if (!a) return;
  const osc = a.ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, a.t);
  osc.frequency.exponentialRampToValueAtTime(to, a.t + seconds);
  const gain = a.ctx.createGain();
  gain.gain.setValueAtTime(0.0001, a.t);
  gain.gain.exponentialRampToValueAtTime(peak, a.t + 0.02);
  gain.gain.setValueAtTime(peak, a.t + seconds * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, a.t + seconds);
  osc.connect(gain).connect(a.out);
  osc.start(a.t);
  osc.stop(a.t + seconds + 0.02);
}

/** An old monitor switching off: a falling hum. */
export function powerDown() {
  sweep(440, 38, 0.85, 0.35);
  sweep(880, 76, 0.6, 0.08, "triangle");
}

/** And back on: a rising hum, then the chime. */
export function powerUp() {
  sweep(60, 520, 0.45, 0.25);
  chime();
}

/**
 * Listens for the whole page (one delegated listener): a tick each time the mouse moves onto something
 * clickable, not again while it stays on it. Touch never ticks. Returns the cleanup.
 */
export function installSounds() {
  useSounds.setState({ enabled: readEnabled() });
  let current: Element | null = null;
  const onOver = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const target = e.target instanceof Element ? e.target.closest(CLICKABLE) : null;
    if (target === current) return;
    current = target;
    if (target) tick();
  };
  document.addEventListener("pointerover", onOver, { passive: true });
  document.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  document.addEventListener("keydown", unlock, { capture: true });
  return () => {
    document.removeEventListener("pointerover", onOver);
    document.removeEventListener("pointerdown", unlock, { capture: true });
    document.removeEventListener("keydown", unlock, { capture: true });
  };
}
