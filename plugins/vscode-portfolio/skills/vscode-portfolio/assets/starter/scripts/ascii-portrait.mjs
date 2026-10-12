#!/usr/bin/env node
/**
 * Generates the ASCII portrait at the top of README.md:
 *   - src/data/portrait.ts       the static art (server-rendered),
 *   - public/portrait-gaze.png   every gaze frame as glyph indices, one tile per pose,
 *   - src/data/portrait-rig.ts   dimensions and the gaze grid, for src/lib/ascii-portrait.ts.
 *
 * Image → ASCII uses ascii-image-converter (https://github.com/TheZoraiz/ascii-image-converter),
 * the converter recommended by the MIT-licensed "ascii-art" agent skill in Nous Research's
 * hermes-agent, for the static art; the gaze frames use the same mapping in JS (verified identical
 * for all 256 values), since 121 subprocesses would add nothing. Photo preparation lives in
 * scripts/lib/sketch.mjs.
 *
 * The gaze frames come from `npm run gaze` (re-posed photos in assets/gaze/). Without them the
 * portrait is static.
 *
 * Usage:
 *   ASCII_IMAGE_CONVERTER=/path/to/ascii-image-converter npm run ascii [-- --cols 160 --preview]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

import { GAZE_DIR, gazeFile, gridValues } from "./lib/gaze.mjs";
import { CELL_ASPECT, RAMP, calibrate, glyphIndex, loadRgb, sketchCells } from "./lib/sketch.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const INPUT = flag("input", "assets/portrait.png");
const OUTPUT = "src/data/portrait.ts";
const RIG_OUTPUT = "src/data/portrait-rig.ts";
const GAZE_OUTPUT = "public/portrait-gaze.png";
const BIN = process.env.ASCII_IMAGE_CONVERTER ?? "ascii-image-converter";
const COLS = Number(flag("cols", 160));
const FRAMED = !args.includes("--no-frame");

const reference = await loadRgb(INPUT);
const geo = await calibrate(reference, COLS);
const { rows } = geo;

// Gaze frames, if `npm run gaze` has produced the full grid. Each pose is processed with the
// reference photo's calibration so crop and tones stay put from frame to frame.
const gridPath = join(GAZE_DIR, "grid.json");
const grid = existsSync(gridPath) ? JSON.parse(readFileSync(gridPath, "utf8")) : null;
const values = grid ? gridValues(grid) : [];
const gazeReady = values.length > 0 && values.every((py) => values.every((px) => existsSync(join(GAZE_DIR, gazeFile(px, py)))));
if (grid && !gazeReady) console.warn(`Gaze grid incomplete in ${GAZE_DIR}; re-run \`npm run gaze\`. Using a static portrait.`);

let frames = null; // frames[iy][ix] = cells
if (gazeReady) {
  frames = [];
  for (const py of values) {
    const row = [];
    for (const px of values) {
      const img = await loadRgb(join(GAZE_DIR, gazeFile(px, py)), { width: reference.W, height: reference.H });
      row.push(await sketchCells(img, geo));
    }
    frames.push(row);
    process.stdout.write(`\rgaze frames: ${frames.length * values.length}/${values.length ** 2}`);
  }
  process.stdout.write("\n");
}

// The static art is the straight-ahead pose (or the original photo), so the animation starts on
// exactly what the server rendered.
const center = values.indexOf(0);
const restCells = frames ? frames[center][center] : await sketchCells(reference, geo);

const dir = mkdtempSync(join(tmpdir(), "ascii-portrait-"));
const prepared = join(dir, "prepared.png");
await sharp(restCells, { raw: { width: COLS, height: rows, channels: 1 } }).png().toFile(prepared);
const ascii = execFileSync(BIN, [prepared, "-d", `${COLS},${rows}`, "-m", RAMP], { encoding: "utf8" });
const art = ascii
  .replace(/\u001b\[[0-9;]*m/g, "")
  .split("\n")
  .slice(0, rows)
  .map((l) => l.replace(/\s+$/, "").padEnd(COLS));

// Square frame. "_" and "|" join into continuous lines in a monospace font at 1em rows.
const lines = FRAMED
  ? [` ${"_".repeat(COLS)} `, ...art.map((l) => `|${l}|`), `|${"_".repeat(COLS)}|`]
  : art.map((l) => l.trimEnd());

if (flag("save-prepared")) {
  // Debug: the per-cell image the converter maps to glyphs, scaled up to the editor's aspect ratio.
  await sharp(prepared)
    .resize(COLS * 6, Math.round(rows * 6 * CELL_ASPECT), { kernel: "nearest" })
    .toFile(flag("save-prepared"));
}

if (args.includes("--preview")) {
  console.log(`${lines.join("\n")}\n\n${COLS}x${lines.length}`);
} else {
  if (frames) {
    // Sprite: tile (ix, iy) holds pose (values[ix], values[iy]); pixel value = glyph index.
    const n = values.length;
    const sprite = Buffer.alloc(n * COLS * n * rows);
    frames.forEach((row, iy) =>
      row.forEach((cells, ix) => {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < COLS; c++) {
            sprite[(iy * rows + r) * n * COLS + ix * COLS + c] = glyphIndex(cells[r * COLS + c]);
          }
        }
      }),
    );
    mkdirSync("public", { recursive: true });
    await sharp(sprite, { raw: { width: n * COLS, height: n * rows, channels: 1 } })
      .png({ compressionLevel: 9, palette: false })
      .toFile(GAZE_OUTPUT);
  } else if (existsSync(GAZE_OUTPUT)) {
    rmSync(GAZE_OUTPUT);
  }

  const rig = {
    cols: COLS,
    rows,
    ramp: RAMP,
    framed: FRAMED,
    gaze: frames ? { src: "/" + GAZE_OUTPUT.replace(/^public\//, ""), values } : null,
  };
  writeFileSync(
    RIG_OUTPUT,
    `// Generated by scripts/ascii-portrait.mjs — do not edit by hand.\n` +
      `export const portraitRig: {\n  cols: number;\n  rows: number;\n  ramp: string;\n  framed: boolean;\n` +
      `  gaze: { src: string; values: number[] } | null;\n} = ${JSON.stringify(rig, null, 2)};\n`,
  );
  writeFileSync(
    OUTPUT,
    `// Generated by scripts/ascii-portrait.mjs from ${frames ? join(GAZE_DIR, gazeFile(0, 0)) : INPUT} — do not edit by hand.\n` +
      `// Converted with ascii-image-converter -d ${COLS},${rows} -m "${RAMP}"\n` +
      `export const portrait: string[] = ${JSON.stringify(lines, null, 2)};\n`,
  );
  console.log(
    `Wrote ${OUTPUT} (${COLS}x${lines.length}) and ${RIG_OUTPUT}` +
      (frames ? `, ${GAZE_OUTPUT} (${values.length}×${values.length} poses)` : " (no gaze frames: static)"),
  );
}
rmSync(dir, { recursive: true, force: true });
