/**
 * Pixel sprites for the README's runner game. "#" is a filled pixel; each sprite pixel is drawn 2×2
 * logical px on a 600×150 field. The runner is the site's pixel monogram (src/data/monogram.ts): each logo
 * pixel is a 3×3 block here, and its dotted drop shadow (one logo pixel down and one left) is a
 * separate layer, drawn in the theme's green. Obstacles and clouds follow Chrome's offline game.
 */

import { MONOGRAM } from "@/data/monogram";

/** Sprite pixels per logo pixel. */
export const CELL = 3;

type Cells = boolean[][];

/**
 * Lays letters out on a grid of logo pixels: column 0 is kept for the shadow, letters follow with one
 * blank column between them, each starting at its own row (row 0 is headroom for a hop).
 */
function layout(letters: [string[], number][], rows: number): Cells {
  const cols = 1 + letters.reduce((w, [bitmap]) => w + bitmap[0].length, 0) + letters.length - 1;
  const grid: Cells = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  let col = 1;
  for (const [bitmap, top] of letters) {
    bitmap.forEach((row, r) => [...row].forEach((ch, c) => ch === "#" && (grid[top + r][col + c] = true)));
    col += bitmap[0].length + 1;
  }
  return grid;
}

/** The shadow: every pixel casts one down and one to the left, wherever that spot is empty. */
const shadowOf = (grid: Cells): Cells => grid.map((row, r) => row.map((on, c) => !on && !!grid[r - 1]?.[c + 1]));

/** Grid → sprite rows; `dot` keeps only each block's centre pixel (the halftone dot). */
function toRows(grid: Cells, dot = false): string[] {
  const out: string[] = [];
  for (const row of grid) {
    for (let i = 0; i < CELL; i++) {
      out.push(row.map((on) => [0, 1, 2].map((j) => (on && (!dot || (i === 1 && j === 1)) ? "#" : ".")).join("")).join(""));
    }
  }
  return out;
}

const squash = (bitmap: string[], keep: number[]) => keep.map((r) => bitmap[r]);
const flip = (bitmap: string[]) => [...bitmap].reverse();
const low = MONOGRAM.map((bitmap) => squash(bitmap, [0, 2, 4])); // ducking: three rows, the letters flattened
/** Each letter at its own top row: `hop` is the index of the letter that's up (or -1 for none). */
const at = (bitmaps: string[][], hop: number): [string[], number][] => bitmaps.map((b, i) => [b, i === hop ? 0 : 1]);

// The "ev" names are historical: they're the monogram's frames, whatever its letters.
const RUNNER = {
  evStand: layout(at(MONOGRAM, -1), 7),
  evRun1: layout(at(MONOGRAM, 0), 7), // the first letter hops…
  evRun2: layout(at(MONOGRAM, MONOGRAM.length - 1), 7), // …then the last
  evDuck1: layout(at(low, 0), 5),
  evDuck2: layout(at(low, MONOGRAM.length - 1), 5),
  evDead: layout(at(MONOGRAM.map(flip), -1), 7), // knocked upside down
};
type RunnerName = keyof typeof RUNNER;

/** The runner's shadow layer (halftone dots), per frame. */
export const SHADES = Object.fromEntries(
  Object.entries(RUNNER).map(([name, grid]) => [name, toRows(shadowOf(grid), true)]),
) as Record<RunnerName, string[]>;

export const SPRITES = {
  ...(Object.fromEntries(Object.entries(RUNNER).map(([n, g]) => [n, toRows(g)])) as Record<RunnerName, string[]>),
  cactusSmall: [
    "...##...",
    "..####..",
    "..####..",
    "#.####..",
    "#.####.#",
    "#.####.#",
    "#.####.#",
    "#.####.#",
    "######.#",
    "..######",
    "..####..",
    "..####..",
    "..####..",
    "..####..",
    "..####..",
    "..####..",
    "..####..",
  ],
  cactusLarge: [
    ".....##.....",
    "....####....",
    "....####....",
    "....####..#.",
    ".#..####.###",
    "###.####.###",
    "###.####.###",
    "###.####.###",
    "###.####.###",
    "###.####.###",
    "###.####.###",
    "###.#######.",
    "###.######..",
    ".#######....",
    "..######....",
    "....####....",
    "....####....",
    "....####....",
    "....####....",
    "....####....",
    "....####....",
    "....####....",
    "....####....",
    "....####....",
  ],
  birdUp: [
    "........##.............",
    "........###............",
    "........####...........",
    "...#....#####..........",
    "..##....######.........",
    ".###....#######........",
    "##############.........",
    "....###############....",
    ".....##############....",
    "......############.....",
    "..............#####....",
  ],
  birdDown: [
    "...#...................",
    "..##...................",
    ".###...................",
    "##############.........",
    "....###############....",
    ".....##############....",
    "......#############....",
    "........######.........",
    "........#####..........",
    "........####...........",
    "........###............",
    "........##.............",
  ],
  cloud: [
    "..........######.......",
    "........##......##.....",
    "......##..........#....",
    "..####.............##..",
    ".#...................#.",
    "#.....................#",
    "#######################",
  ],
};

export type SpriteName = keyof typeof SPRITES;

/** Each sprite pixel covers this many logical px. */
export const PIXEL = 2;

export const spriteSize = (name: SpriteName) => ({
  w: SPRITES[name][0].length * PIXEL,
  h: SPRITES[name].length * PIXEL,
});
