import type { ReactNode } from "react";

/**
 * Block lettering with its ░ shading picked out: runs of ░ get the `ascii-shade` class (the theme's
 * green), so the README greeting reads like the pixel logo — light letters, green dotted shadow.
 */
export function withShade(text: string): ReactNode[] {
  return text.split(/(░+)/).map((part, i) =>
    part.startsWith("░") ? (
      <span key={i} className="ascii-shade">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
