import type { IconType } from "react-icons";
import {
  VscFolder,
  VscFolderOpened,
  VscInfo,
  VscJson,
  VscOutput,
  VscTerminalBash,
  VscFile,
} from "react-icons/vsc";
import { SiJavascript, SiMarkdown, SiPython, SiReact, SiTypescript, SiYaml } from "react-icons/si";

import { cn } from "@/lib/utils";

const byExtension: Record<string, { icon: IconType; color: string; scale?: string }> = {
  md: { icon: SiMarkdown, color: "#519aba" },
  tsx: { icon: SiReact, color: "#4fc1ff" },
  ts: { icon: SiTypescript, color: "#3178c6", scale: "scale-[0.85]" },
  js: { icon: SiJavascript, color: "#cbcb41", scale: "scale-[0.85]" },
  py: { icon: SiPython, color: "#4b8bbe" },
  json: { icon: VscJson, color: "#cbcb41" },
  yml: { icon: SiYaml, color: "#a074c4", scale: "scale-[0.85]" },
  log: { icon: VscOutput, color: "#8dc149" },
  sh: { icon: VscTerminalBash, color: "#8dc149" },
};

export function FileIcon({ name, className }: { name: string; className?: string }) {
  if (/^readme/i.test(name)) {
    return <VscInfo aria-hidden className={cn("size-4 shrink-0", className)} style={{ color: "#519aba" }} />;
  }
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  const entry = byExtension[ext];
  const Icon = entry?.icon ?? VscFile;
  return (
    <Icon
      aria-hidden
      className={cn("size-4 shrink-0", entry?.scale, className)}
      style={{ color: entry?.color }}
    />
  );
}

export function FolderIcon({ open, className }: { open?: boolean; className?: string }) {
  const Icon = open ? VscFolderOpened : VscFolder;
  return <Icon aria-hidden className={cn("size-4 shrink-0 text-folder", className)} />;
}
