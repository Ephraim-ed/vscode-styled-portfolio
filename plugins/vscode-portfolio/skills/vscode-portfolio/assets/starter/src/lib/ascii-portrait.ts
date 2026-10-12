import { portraitRig as rig } from "@/data/portrait-rig";

/** Whether gaze frames were generated (`npm run gaze`, then `npm run ascii`). */
export const hasGaze = rig.gaze !== null;
export const portraitDimensions = { cols: rig.cols, rows: rig.rows, framed: rig.framed };

/**
 * Loads the gaze sprite exported by scripts/ascii-portrait.mjs: one tile per pose, each pixel a glyph
 * index into the ramp.
 */
export async function loadGazeSprite(): Promise<Uint8Array> {
  if (!rig.gaze) throw new Error("No gaze frames");
  const n = rig.gaze.values.length;
  const width = n * rig.cols;
  const height = n * rig.rows;
  const res = await fetch(rig.gaze.src);
  if (!res.ok) throw new Error(`Couldn't load ${rig.gaze.src}`);
  const bitmap = await createImageBitmap(await res.blob(), {
    colorSpaceConversion: "none",
    premultiplyAlpha: "none",
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas unavailable");
  ctx.drawImage(bitmap, 0, 0);
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const sprite = new Uint8Array(width * height);
  for (let i = 0; i < sprite.length; i++) sprite[i] = rgba[i * 4];
  return sprite;
}

/**
 * Returns a function from a gaze direction (x, y in [-1, 1]; +x right, +y down) to the portrait's
 * text: the nearest pre-rendered pose. Each frame's text is built once and cached.
 */
export function createGazePlayer(sprite: Uint8Array) {
  if (!rig.gaze) throw new Error("No gaze frames");
  const { cols, rows, ramp, framed } = rig;
  const n = rig.gaze.values.length;
  const stride = n * cols;
  const glyphs = Array.from(ramp, (ch) => ch.charCodeAt(0));
  const line = new Uint16Array(cols + (framed ? 2 : 0));
  const pipe = "|".charCodeAt(0);
  const top = ` ${"_".repeat(cols)} `;
  const bottom = `|${"_".repeat(cols)}|`;
  const cache = new Map<number, string>();

  const build = (ix: number, iy: number) => {
    const out: string[] = framed ? [top] : [];
    for (let r = 0; r < rows; r++) {
      const base = (iy * rows + r) * stride + ix * cols;
      let i = 0;
      if (framed) line[i++] = pipe;
      for (let c = 0; c < cols; c++) line[i++] = glyphs[sprite[base + c]] ?? 32;
      if (framed) line[i++] = pipe;
      const text = String.fromCharCode.apply(null, line as unknown as number[]);
      out.push(framed ? text : text.trimEnd());
    }
    if (framed) out.push(bottom);
    return out.join("\n");
  };

  const toIndex = (v: number) => Math.round(((Math.max(-1, Math.min(1, v)) + 1) / 2) * (n - 1));

  return (x: number, y: number) => {
    const ix = toIndex(x);
    const iy = toIndex(y);
    const key = iy * n + ix;
    let text = cache.get(key);
    if (!text) cache.set(key, (text = build(ix, iy)));
    return text;
  };
}
