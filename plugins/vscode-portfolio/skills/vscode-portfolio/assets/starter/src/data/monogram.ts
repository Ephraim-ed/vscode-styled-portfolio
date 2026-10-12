import { profile } from "./profile";

/**
 * A 5×5 pixel alphabet (lowercase shapes, squeezed onto the x-height) for the monogram: the pixel
 * logo, the favicon and app icon, and the runner game's hero. "#" is a filled pixel. Widths vary.
 */
export const PIXEL_FONT: Record<string, string[]> = {
  a: [".###.", "....#", ".####", "#...#", ".####"],
  b: ["#....", "#....", "####.", "#...#", "####."],
  c: [".####", "#....", "#....", "#....", ".####"],
  d: ["....#", "....#", ".####", "#...#", ".####"],
  e: [".###.", "#...#", "#####", "#....", ".####"],
  f: ["..###", ".#...", "####.", ".#...", ".#..."],
  g: [".####", "#...#", ".####", "....#", ".###."],
  h: ["#....", "#....", "####.", "#...#", "#...#"],
  i: ["#", ".", "#", "#", "#"],
  j: ["..#", "...", "..#", "#.#", ".#."],
  k: ["#....", "#..#.", "###..", "#..#.", "#...#"],
  l: ["#.", "#.", "#.", "#.", ".#"],
  m: ["##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#"],
  n: ["####.", "#...#", "#...#", "#...#", "#...#"],
  o: [".###.", "#...#", "#...#", "#...#", ".###."],
  p: ["####.", "#...#", "####.", "#....", "#...."],
  q: [".####", "#...#", ".####", "....#", "....#"],
  r: ["#.##", "##..", "#...", "#...", "#..."],
  s: [".####", "#....", ".###.", "....#", "####."],
  t: [".#..", "####", ".#..", ".#..", "..##"],
  u: ["#...#", "#...#", "#...#", "#...#", ".####"],
  v: ["#...#", "#...#", "#...#", ".#.#.", "..#.."],
  w: ["#...#", "#...#", "#.#.#", "#.#.#", ".#.#."],
  x: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  y: ["#...#", "#...#", ".####", "....#", ".###."],
  z: ["#####", "...#.", "..#..", ".#...", "#####"],
};

/** The monogram's letters as bitmaps (unknown characters are skipped; empty falls back to "ab"). */
export const MONOGRAM: string[][] = (() => {
  const letters = [...profile.monogram.toLowerCase()].filter((c) => PIXEL_FONT[c]);
  return (letters.length ? letters : ["a", "b"]).map((c) => PIXEL_FONT[c]);
})();

/** The monogram as rows of pixels, one blank column between letters. */
export const MONOGRAM_ROWS: string[] = MONOGRAM[0].map((_, r) => MONOGRAM.map((bitmap) => bitmap[r]).join("."));
