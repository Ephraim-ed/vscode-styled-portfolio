"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Mac-style shortcut labels on Apple platforms, Ctrl-style elsewhere. */
export function useIsMac() {
  return useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent),
    () => true,
  );
}

export type Keybinding = { mac: string; other: string };

export const keybindings = {
  quickOpen: { mac: "⌘P", other: "Ctrl+P" },
  commandPalette: { mac: "⇧⌘P", other: "Ctrl+Shift+P" },
  toggleSidebar: { mac: "⌘B", other: "Ctrl+B" },
  toggleTerminal: { mac: "⌃`", other: "Ctrl+`" },
  explorer: { mac: "⇧⌘E", other: "Ctrl+Shift+E" },
  search: { mac: "⇧⌘F", other: "Ctrl+Shift+F" },
  scm: { mac: "⌃⇧G", other: "Ctrl+Shift+G" },
  extensions: { mac: "⇧⌘X", other: "Ctrl+Shift+X" },
  markdownPreview: { mac: "⇧⌘V", other: "Ctrl+Shift+V" },
  chat: { mac: "⌥⌘B", other: "Ctrl+Alt+B" },
} satisfies Record<string, Keybinding>;

export function useKeybindingLabel() {
  const isMac = useIsMac();
  return (k: Keybinding) => (isMac ? k.mac : k.other);
}
