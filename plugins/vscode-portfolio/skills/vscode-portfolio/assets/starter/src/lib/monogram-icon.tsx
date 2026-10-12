import { ImageResponse } from "next/og";

import { MONOGRAM_ROWS as ROWS } from "@/data/monogram";

const INK = "#1E1E1E"; // the tile
const PAPER = "#FFFFFF"; // the letters
// At icon sizes the halftone shadow is drawn as solid pixels in the tone the dots read as: the
// dark theme's green (#23D18B) mixed half and half with the tile.
const TONE = "#20785A";

const on = (r: number, c: number) => ROWS[r]?.[c] === "#";

/**
 * The pixel monogram on a dark rounded tile, as a PNG: the favicon (src/app/icon.tsx) and the Apple
 * touch icon (src/app/apple-icon.tsx). Same drawing as <PixelLogo>, with the shadow solid.
 */
export function monogramIcon(px: number) {
  const cols = ROWS[0].length + 1; // + the shadow column on the left
  const rows = ROWS.length + 1; // + the shadow row below
  const cell = Math.floor((px * 0.78) / Math.max(cols, rows));
  const left = Math.round((px - cols * cell) / 2);
  const top = Math.round((px - rows * cell) / 2);
  const pixels: { x: number; y: number; color: string }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = -1; c < ROWS[0].length; c++) {
      if (on(r, c)) pixels.push({ x: c + 1, y: r, color: PAPER });
      else if (on(r - 1, c + 1)) pixels.push({ x: c + 1, y: r, color: TONE });
    }
  }
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: px, height: px, background: INK, borderRadius: px * 0.19 }}>
        {pixels.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: left + p.x * cell,
              top: top + p.y * cell,
              width: cell,
              height: cell,
              background: p.color,
            }}
          />
        ))}
      </div>
    ),
    { width: px, height: px },
  );
}
