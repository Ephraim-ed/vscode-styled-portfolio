"use client";

import { useRef, useState } from "react";
import { VscCheck, VscClose, VscInfo } from "react-icons/vsc";

import { WORKSPACE } from "@/data/files";
import { themes } from "@/data/themes";
import { useWorkbench, type PanelTab } from "@/lib/store";
import { cn } from "@/lib/utils";

import { useWorkspace } from "../workspace-context";
import { Terminal } from "./terminal";

const tabs: { id: PanelTab; label: string }[] = [
  { id: "problems", label: "Problems" },
  { id: "output", label: "Output" },
  { id: "terminal", label: "Terminal" },
];

function Problems() {
  return (
    <p className="flex items-center gap-2 px-4 py-2 text-[13px] text-description">
      <VscCheck className="size-4 text-ansi-green" />
      No problems have been detected in the workspace.
    </p>
  );
}

function Output() {
  const { files } = useWorkspace();
  const lines = [
    `Workspace "${WORKSPACE}" loaded — ${files.length} files`,
    `Syntax highlighting by Shiki, pre-rendered for ${themes.length} themes`,
    "Built with Next.js, React, Tailwind CSS, shadcn/ui (Radix), cmdk, Motion, Zustand and react-icons",
    "All content is generated from src/data/profile.ts",
  ];
  return (
    <div className="px-4 py-2 font-mono text-[13px] leading-relaxed text-terminal-foreground">
      {lines.map((l) => (
        <p key={l}>
          <span className="text-ansi-blue">[info]</span> {l}
        </p>
      ))}
    </div>
  );
}

export function Panel() {
  const panelOpen = useWorkbench((s) => s.panelOpen);
  const panelTab = useWorkbench((s) => s.panelTab);
  const openPanel = useWorkbench((s) => s.openPanel);
  const closePanel = useWorkbench((s) => s.closePanel);
  const [height, setHeight] = useState(260);
  const drag = useRef<{ y: number; height: number } | null>(null);
  const ref = useRef<HTMLElement>(null);

  if (!panelOpen) return null;

  return (
    <section
      ref={ref}
      aria-label="Panel"
      style={{ height }}
      className="relative flex shrink-0 flex-col border-t border-panel-border bg-panel max-md:h-[45%]!"
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panel"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, height };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const max = (ref.current?.parentElement?.clientHeight ?? 800) - 120;
          setHeight(Math.min(max, Math.max(100, drag.current.height - (e.clientY - drag.current.y))));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        className="absolute inset-x-0 -top-[3px] z-20 h-1.5 cursor-ns-resize touch-none transition-colors delay-150 hover:bg-focus max-md:hidden"
      />

      <div className="flex h-[35px] shrink-0 items-center pr-2 pl-2">
        <div role="tablist" aria-label="Panel" className="no-scrollbar flex min-w-0 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={panelTab === t.id}
              onClick={() => openPanel(t.id)}
              className={cn(
                "relative mx-1.5 flex h-[35px] items-center px-0.5 text-[11px] tracking-wide whitespace-nowrap uppercase",
                panelTab === t.id ? "text-tab-active-foreground" : "text-tab-foreground hover:text-tab-active-foreground",
              )}
            >
              {t.label}
              {panelTab === t.id && <span aria-hidden className="absolute inset-x-0 bottom-1.5 h-px bg-tab-active-border" />}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          <span className="mr-2 flex items-center gap-1 text-xs text-description max-sm:hidden">
            <VscInfo className="size-3.5" /> zsh
          </span>
          <button
            type="button"
            aria-label="Close Panel"
            title="Close Panel"
            onClick={closePanel}
            className="grid size-6 place-items-center rounded-md text-tab-active-foreground/80 hover:bg-list-hover"
          >
            <VscClose className="size-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {panelTab === "problems" && <Problems />}
        {panelTab === "output" && <Output />}
        <div className={cn("h-full", panelTab !== "terminal" && "hidden")}>
          <Terminal active={panelTab === "terminal"} />
        </div>
      </div>
    </section>
  );
}
