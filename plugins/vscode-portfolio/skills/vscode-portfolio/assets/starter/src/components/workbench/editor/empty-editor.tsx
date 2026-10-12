"use client";

import { CONTACT_PATH, HOME_PATH } from "@/data/files";
import { keybindings, useKeybindingLabel } from "@/lib/platform";
import { useWorkbench } from "@/lib/store";

/** The watermark VS Code shows when no editor is open. */
export function EmptyEditor() {
  const label = useKeybindingLabel();
  const openPalette = useWorkbench((s) => s.openPalette);
  const togglePanel = useWorkbench((s) => s.togglePanel);
  const openFile = useWorkbench((s) => s.openFile);

  const entries = [
    { text: "Show All Commands", key: label(keybindings.commandPalette), run: () => openPalette("commands") },
    { text: "Go to File", key: label(keybindings.quickOpen), run: () => openPalette("files") },
    { text: "Toggle Terminal", key: label(keybindings.toggleTerminal), run: () => togglePanel("terminal") },
    { text: "Open README", key: HOME_PATH, run: () => openFile(HOME_PATH) },
    { text: "Get in Touch", key: CONTACT_PATH, run: () => openFile(CONTACT_PATH) },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 select-none">
      <div aria-hidden className="font-mono text-7xl font-bold tracking-tighter text-editor-foreground/10 md:text-8xl">
        {"{ev}"}
      </div>
      <ul className="grid gap-1.5 text-[13px]">
        {entries.map((e) => (
          <li key={e.text}>
            <button
              type="button"
              onClick={e.run}
              className="grid w-full grid-cols-[1fr_auto] gap-6 rounded px-2 py-0.5 text-left text-description hover:text-editor-foreground"
            >
              <span className="text-right">{e.text}</span>
              <span className="font-mono text-xs opacity-80">{e.key}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
