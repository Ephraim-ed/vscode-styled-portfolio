import { monogramIcon } from "@/lib/monogram-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** The favicon: the pixel monogram (profile.monogram). */
export default function Icon() {
  return monogramIcon(size.width);
}
