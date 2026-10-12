import { MONOGRAM_ROWS as ROWS } from "@/data/monogram";
import { cn } from "@/lib/utils";

// The pixel monogram (profile.monogram, drawn with src/data/monogram.ts): 5-row letters, each pixel
// casting a dotted shadow one pixel down and one to the left. Drawn on a 10-unit grid; the shadow
// column sits at x = -10.
const on = (r: number, c: number) => ROWS[r]?.[c] === "#";

const LETTERS = ROWS.flatMap((row, r) =>
  [...row.matchAll(/#+/g)].map((m) => `M${m.index * 10} ${r * 10}h${m[0].length * 10}v10h-${m[0].length * 10}z`),
).join("");

const SHADOW = Array.from({ length: ROWS.length + 1 }, (_, r) =>
  Array.from({ length: ROWS[0].length + 1 }, (_, i) => i - 1)
    .filter((c) => !on(r, c) && on(r - 1, c + 1))
    .map((c) => `M${c * 10 + 3} ${r * 10 + 3}h4v4h-4z`)
    .join(""),
).join("");

const VIEW_BOX = `-10 0 ${(ROWS[0].length + 1) * 10} ${(ROWS.length + 1) * 10}`;

/** The site's pixel logo. Letters take `currentColor`; the dotted shadow takes the theme's green. */
export function PixelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox={VIEW_BOX} aria-hidden className={cn("block", className)} shapeRendering="crispEdges">
      <path d={SHADOW} fill="var(--ansi-green)" className="pixel-logo-shadow" />
      <path d={LETTERS} fill="currentColor" />
    </svg>
  );
}
