#!/usr/bin/env node
/**
 * Generates the gaze grid: the portrait photo re-posed to look in different directions, so the ASCII
 * portrait can genuinely look at the cursor. Same recipe as Face Looker by Kylan O'Connor (MIT,
 * github.com/kylan02/face_looker): Replicate's fofr/expression-editor (LivePortrait), varying
 * pupil_x / pupil_y over a grid with the head turning along (yaw/pitch ±10°).
 *
 * Needs REPLICATE_API_TOKEN (environment or .env.local). Costs about $0.001 per image on your
 * Replicate account; the default 11×11 grid is 121 images (≈ $0.12). Results are cached in
 * assets/gaze/, so re-running only generates what's missing. Then run `npm run ascii`.
 *
 * Usage: npm run gaze [-- --input assets/portrait.png --step 3 --concurrency 4]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

import { GAZE_DIR, gazeFile, gridValues } from "./lib/gaze.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const INPUT = flag("input", "assets/portrait.png");
const OUT_DIR = GAZE_DIR;
const MODEL_VERSION = "bf913bc90e1c44ba288ba3942a538693b72e8cc7df576f3beebe56adc0a92b86"; // fofr/expression-editor
const P = 15; // pupil range ±P
const STEP = Number(flag("step", 3));
const CONCURRENCY = Number(flag("concurrency", 4));
const MAX_TURN = 10; // degrees of head yaw/pitch at the edge of the grid

function token() {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
  if (existsSync(".env.local")) {
    const m = readFileSync(".env.local", "utf8").match(/^REPLICATE_API_TOKEN=["']?([^"'\s]+)/m);
    if (m) return m[1];
  }
  console.error("REPLICATE_API_TOKEN is not set. Add it to .env.local (gitignored) or the environment.");
  process.exit(1);
}

const TOKEN = token();
const api = async (url, init = {}) => {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...init.headers },
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${res.status} ${body.detail ?? body.title ?? JSON.stringify(body)}`);
    return body;
  }
};

async function run(image, px, py) {
  let prediction = await api("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Prefer: "wait=60" },
    body: JSON.stringify({
      version: MODEL_VERSION,
      input: {
        image,
        pupil_x: px,
        pupil_y: py,
        rotate_yaw: (px / P) * MAX_TURN,
        rotate_pitch: -(py / P) * MAX_TURN,
        output_format: "webp",
        output_quality: 95,
      },
    }),
  });
  while (!["succeeded", "failed", "canceled"].includes(prediction.status)) {
    await new Promise((r) => setTimeout(r, 1000));
    prediction = await api(prediction.urls.get);
  }
  if (prediction.status !== "succeeded") throw new Error(prediction.error ?? prediction.status);
  const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const values = gridValues({ range: P, step: STEP });
const jobs = values.flatMap((py) => values.map((px) => ({ px, py })));
mkdirSync(OUT_DIR, { recursive: true });
const todo = jobs.filter(({ px, py }) => !existsSync(join(OUT_DIR, gazeFile(px, py))));
console.log(`${jobs.length} poses, ${todo.length} to generate (≈ $${(todo.length * 0.001).toFixed(2)})`);

// Sent inline as a data URL; Replicate caps those at 256 KB, so step the JPEG quality down if needed.
let jpeg;
for (let quality = 92; ; quality -= 4) {
  jpeg = await sharp(INPUT).flatten({ background: "#ffffff" }).jpeg({ quality }).toBuffer();
  if (jpeg.length * 1.34 < 250_000 || quality <= 70) break;
}
const image = `data:image/jpeg;base64,${jpeg.toString("base64")}`;

let done = 0;
const failures = [];
const worker = async () => {
  for (let job = todo.shift(); job; job = todo.shift()) {
    try {
      writeFileSync(join(OUT_DIR, gazeFile(job.px, job.py)), await run(image, job.px, job.py));
      process.stdout.write(`\r${++done} generated`);
    } catch (e) {
      failures.push(`(${job.px}, ${job.py}): ${e.message}`);
    }
  }
};
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(failures.length ? `\nFailed:\n${failures.join("\n")}\nRe-run to retry.` : "\nDone. Now run: npm run ascii");
writeFileSync(join(OUT_DIR, "grid.json"), JSON.stringify({ range: P, step: STEP, maxTurn: MAX_TURN }, null, 2));
