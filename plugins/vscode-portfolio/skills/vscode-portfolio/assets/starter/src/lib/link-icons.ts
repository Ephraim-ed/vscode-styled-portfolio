import type { IconType } from "react-icons";
import {
  TbBrandBehance,
  TbBrandDribbble,
  TbBrandFigma,
  TbBrandInstagram,
  TbBrandLinkedin,
  TbBrandMedium,
  TbBrandStackoverflow,
  TbBrandX,
  TbBrandYoutube,
  TbWorld,
} from "react-icons/tb";
import { VscGithub } from "react-icons/vsc";

const BY_HOST: [RegExp, IconType][] = [
  [/(^|\.)github\.com$/, VscGithub],
  [/(^|\.)linkedin\.com$/, TbBrandLinkedin],
  [/(^|\.)behance\.net$/, TbBrandBehance],
  [/(^|\.)dribbble\.com$/, TbBrandDribbble],
  [/(^|\.)figma\.com$/, TbBrandFigma],
  [/(^|\.)instagram\.com$/, TbBrandInstagram],
  [/(^|\.)medium\.com$/, TbBrandMedium],
  [/(^|\.)stackoverflow\.com$/, TbBrandStackoverflow],
  [/(^|\.)(x|twitter)\.com$/, TbBrandX],
  [/(^|\.)(youtube\.com|youtu\.be)$/, TbBrandYoutube],
];

/** The brand icon for a web link (GitHub, LinkedIn, Behance…), or a globe. */
export function linkIcon(url: string): IconType {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return BY_HOST.find(([re]) => re.test(host))?.[1] ?? TbWorld;
  } catch {
    return TbWorld;
  }
}
