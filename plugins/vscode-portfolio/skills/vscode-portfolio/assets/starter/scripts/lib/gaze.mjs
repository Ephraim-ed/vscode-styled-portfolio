/** Where scripts/generate-gaze.mjs caches the re-posed photos, and how they're named. */
export const GAZE_DIR = "assets/gaze";
export const gazeFile = (px, py) => `gaze_px${px}_py${py}.webp`;

/** Grid values from the generator's grid.json: -range..range in steps of `step`. */
export const gridValues = ({ range, step }) => {
  const values = [];
  for (let v = -range; v <= range; v += step) values.push(v);
  return values;
};
