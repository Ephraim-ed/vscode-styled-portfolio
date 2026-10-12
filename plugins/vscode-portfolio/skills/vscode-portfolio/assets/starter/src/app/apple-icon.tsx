import { monogramIcon } from "@/lib/monogram-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The Apple touch icon: the pixel monogram (profile.monogram). */
export default function AppleIcon() {
  return monogramIcon(size.width);
}
