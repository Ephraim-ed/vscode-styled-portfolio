/**
 * Turns a photo into "sketch" tone cells — one byte per ASCII character cell, where 0 is blank and
 * brighter means a denser glyph. Shared by scripts/ascii-portrait.mjs (static art and the gaze
 * frames).
 *
 * `calibrate()` measures the crop, tone range and lip/jaw thresholds on one reference image;
 * `sketchCells()` applies them to any image of the same framing. Gaze frames all use the reference's
 * calibration, so the crop and tones don't flicker from frame to frame.
 *
 * Pipeline:
 *   1. remove the white studio background,
 *   2. crop to head and shoulders (square),
 *   3. stretch contrast, thicken thin dark strokes (glasses, brows), add local contrast, then draw
 *      in the lips and jawline, which are too low-contrast to survive on their own,
 *   4. invert into "sketch" mode so dark features become the marks — a pencil sketch on light
 *      themes, a chalk sketch on dark ones,
 *   5. downsample to one value per character cell.
 */
import sharp from "sharp";

// Sparse → dense. jp2a's ramp shades smoothly without turning into letter soup.
// (No backticks: three in a row would close the markdown fence the art sits in.)
export const RAMP = "   ...',;:clodxkO0KXNWM";
// Art cells are 0.6em wide and 1em tall (see .line.art and .ascii-art in globals.css). Tight rows
// matter: the mouth is only a few rows tall.
export const CELL_ASPECT = 1 / 0.6;

// Tuned by eye on this photo.
const CROP_WIDTH = 1.6; // × head width
const CLAHE_SLOPE = 2;
const GAMMA = 1.4; // > 1 keeps skin light so features stand out
// Highlights: the brightest skin maps to the first visible glyph instead of blank, so the cheeks and
// chin keep their outline against the background.
const FLOOR = Math.ceil((RAMP.search(/\S/) * 256) / RAMP.length) + 1;
// Shadows: caps density so the hair, suit and neck shadow don't overpower the face.
const CEILING = 190;
// Lower-face detail (step 3d), as fractions of the head width below the top of the hair.
const DETAIL_TOP = 0.86; // just under the nose
const DETAIL_BOTTOM = 1.42; // past the chin, onto the neck
const DETAIL_HALF_WIDTH = 0.42;
const EDGE_WEIGHT = 0.5; // contour lines: jaw, chin, lip outlines
const LIP_WEIGHT = 0.28; // lip tone from redness; higher turns the lips into a solid bar

export async function loadRgb(input, size) {
  let img = sharp(input).removeAlpha();
  if (size) img = img.resize(size.width, size.height, { fit: "fill" });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

const lumAt = ({ data, W }, x, y) => {
  const i = (y * W + x) * 3;
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
};

// 1. Background mask. The backdrop is pure white, but so are parts of the shirt, and they touch at
//    the collar, so a flood fill leaks in. Instead, scan down each column from the top and in along
//    each row from both sides, stopping at the first non-white pixel.
function backgroundMask({ data, W, H }) {
  const bg = new Uint8Array(W * H);
  const isBackdrop = (x, y) => {
    const i = (y * W + x) * 3;
    return Math.min(data[i], data[i + 1], data[i + 2]) > 245;
  };
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H && isBackdrop(x, y); y++) bg[y * W + x] = 1;
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W && isBackdrop(x, y); x++) bg[y * W + x] = 1;
    for (let x = W - 1; x >= 0 && isBackdrop(x, y); x--) bg[y * W + x] = 1;
  }
  return bg;
}

const ramp01 = (v, a, b) => Math.min(1, Math.max(0, (v - a) / (b - a)));
const percentile = (arr, q) => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length * q)];

/** Measures framing and tone on the reference image. */
export async function calibrate(img, cols) {
  const { W, H } = img;
  const bg = backgroundMask(img);

  // 2. Crop from just above the hair, centred on the head.
  let top = H;
  let left = W;
  let right = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (bg[y * W + x]) continue;
      top = Math.min(top, y);
      if (y < H * 0.6) {
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
  }
  const headWidth = right - left;
  const cropW = Math.min(W, Math.round(headWidth * CROP_WIDTH));
  const cropX = Math.max(0, Math.min(W - cropW, Math.round((left + right) / 2 - cropW / 2)));
  const cropY = Math.max(0, top - Math.round(headWidth * 0.06));
  const cropH = Math.min(H - cropY, cropW); // square, for the square frame
  const rows = Math.round((cols * cropH) / cropW / CELL_ASPECT);
  const geo = { W, H, cols, rows, top, left, right, headWidth, cropX, cropY, cropW, cropH };

  // 3a. Tone range: the subject's 2nd and 98th percentile.
  const tones = [];
  forCrop(geo, (x, y) => !bg[(y + cropY) * W + x + cropX] && tones.push(lumAt(img, x + cropX, y + cropY)));
  geo.lo = percentile(tones, 0.02);
  geo.hi = percentile(tones, 0.98);

  // 3d thresholds, measured within the lower-face band.
  const { band, edge, redness } = await lowerFace(img, geo, stretch(img, geo));
  const bandEdges = [];
  const bandReds = [];
  forCrop(geo, (x, y, i) => {
    if (band[i] > 0.5 && !bg[(y + cropY) * W + x + cropX]) {
      bandEdges.push(edge[i]);
      bandReds.push(redness[i]);
    }
  });
  geo.edgeHi = percentile(bandEdges, 0.97);
  geo.redLo = percentile(bandReds, 0.75); // ordinary skin
  geo.redHi = percentile(bandReds, 0.985); // the lips
  return geo;
}

function forCrop({ cropW, cropH }, fn) {
  for (let y = 0; y < cropH; y++) for (let x = 0; x < cropW; x++) fn(x, y, y * cropW + x);
}

function stretch(img, geo) {
  const out = Buffer.alloc(geo.cropW * geo.cropH);
  forCrop(geo, (x, y, i) => {
    const t = (lumAt(img, x + geo.cropX, y + geo.cropY) - geo.lo) / (geo.hi - geo.lo);
    out[i] = Math.round(255 * Math.min(1, Math.max(0, t)));
  });
  return out;
}

// 3d. Lips and chin differ from the surrounding skin mostly by hue and soft shading, which the tone
//     curve flattens away. Within a soft band over the mouth and jaw, add contour lines from a
//     character-scale edge map, plus a lip tone from redness (red vs green).
async function lowerFace(img, geo, stretched) {
  const { cropW, cropH, cropX, cropY, headWidth, cols } = geo;
  const headTop = geo.top - cropY;
  const headCx = (geo.left + geo.right) / 2 - cropX;
  const band = new Float32Array(cropW * cropH);
  forCrop(geo, (x, y, i) => {
    const t = (y - headTop) / headWidth;
    const wy = ramp01(t, DETAIL_TOP, DETAIL_TOP + 0.1) * (1 - ramp01(t, DETAIL_BOTTOM - 0.1, DETAIL_BOTTOM));
    const wx = Math.max(0, 1 - Math.pow(Math.abs(x - headCx) / (DETAIL_HALF_WIDTH * headWidth), 4));
    band[i] = wy * wx;
  });
  // Blur to about half a character cell first so the edges are ones that survive downsampling.
  const blurred = await sharp(stretched, { raw: { width: cropW, height: cropH, channels: 1 } })
    .blur(Math.max(0.5, (cropW / cols) * 0.5))
    .toColourspace("b-w")
    .raw()
    .toBuffer();
  const edge = new Float32Array(cropW * cropH);
  const redness = new Float32Array(cropW * cropH);
  forCrop(geo, (x, y, i) => {
    if (x > 0 && y > 0 && x < cropW - 1 && y < cropH - 1) {
      // Sobel gradient magnitude.
      const p = (dx, dy) => blurred[(y + dy) * cropW + x + dx];
      const gx = p(1, -1) + 2 * p(1, 0) + p(1, 1) - p(-1, -1) - 2 * p(-1, 0) - p(-1, 1);
      const gy = p(-1, 1) + 2 * p(0, 1) + p(1, 1) - p(-1, -1) - 2 * p(0, -1) - p(1, -1);
      edge[i] = Math.hypot(gx, gy);
    }
    const j = ((y + cropY) * img.W + x + cropX) * 3;
    redness[i] = (img.data[j] - img.data[j + 1]) / (img.data[j] + img.data[j + 1] + 1);
  });
  return { band, edge, redness };
}

/** Sketch tone per character cell (geo.cols × geo.rows), using the reference calibration. */
export async function sketchCells(img, geo) {
  const { W, cols, rows, cropX, cropY, cropW, cropH } = geo;
  const bg = backgroundMask(img);
  const stretched = stretch(img, geo);

  // 3b. Thin dark strokes are a few pixels wide but each character covers several source pixels, so
  //     averaging erases them. A separable min filter thickens them first (about half a cell).
  const r = Math.max(1, Math.round((cropW / cols) * 0.45));
  const minPass = (from, dx, dy, radius) => {
    const to = Buffer.alloc(from.length);
    forCrop(geo, (x, y, i) => {
      let m = 255;
      for (let k = -radius; k <= radius; k++) {
        const sx = x + k * dx;
        const sy = y + k * dy;
        if (sx >= 0 && sx < cropW && sy >= 0 && sy < cropH) m = Math.min(m, from[sy * cropW + sx]);
      }
      to[i] = m;
    });
    return to;
  };
  const thickened = minPass(minPass(stretched, 1, 0, r), 0, 1, Math.round(r * 1.5));

  // 3c. Local contrast (CLAHE) brings out the eyes, glasses and hairline at low resolution.
  const enhanced = await sharp(thickened, { raw: { width: cropW, height: cropH, channels: 1 } })
    .clahe({ width: Math.round(cropW / 8), height: Math.round(cropH / 8), maxSlope: CLAHE_SLOPE })
    .sharpen({ sigma: 1.2 })
    .toColourspace("b-w") // sharp returns 3 channels otherwise
    .raw()
    .toBuffer();

  const { band, edge, redness } = await lowerFace(img, geo, stretched);

  // 4. Sketch mode: invert so dark features become the marks. Background stays 0 → blank.
  const sketch = Buffer.alloc(cropW * cropH);
  forCrop(geo, (x, y, i) => {
    if (bg[(y + cropY) * W + x + cropX]) return;
    const ink = 1 - enhanced[i] / 255;
    const detail =
      EDGE_WEIGHT * Math.min(1, edge[i] / geo.edgeHi) + LIP_WEIGHT * ramp01(redness[i], geo.redLo, geo.redHi);
    const v = Math.min(1, Math.pow(ink, GAMMA) + band[i] * detail);
    sketch[i] = Math.round(FLOOR + v * (CEILING - FLOOR));
  });

  // 5. Downsample to a 2× field, then box-average to one value per cell.
  const FW = cols * 2;
  const FH = rows * 2;
  const field = await sharp(sketch, { raw: { width: cropW, height: cropH, channels: 1 } })
    .resize(FW, FH, { fit: "fill", kernel: "mitchell" })
    .toColourspace("b-w")
    .raw()
    .toBuffer();
  const cells = Buffer.alloc(cols * rows);
  for (let cr = 0; cr < rows; cr++) {
    for (let c = 0; c < cols; c++) {
      const i = cr * 2 * FW + c * 2;
      cells[cr * cols + c] = Math.round((field[i] + field[i + 1] + field[i + FW] + field[i + FW + 1]) / 4);
    }
  }
  return cells;
}

/** ascii-image-converter's brightness → glyph mapping (verified against the binary for all 256 values). */
export function glyphIndex(v) {
  return Math.min(RAMP.length - 1, Math.floor((v * RAMP.length) / 255));
}
