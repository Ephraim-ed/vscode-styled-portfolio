"use client";

import {
  VscLayoutPanel,
  VscLayoutPanelOff,
  VscLayoutSidebarRight,
  VscLayoutSidebarRightOff,
  VscLayoutSidebarLeft,
  VscLayoutSidebarLeftOff,
  VscSearch,
} from "react-icons/vsc";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { assistant, features, profile } from "@/data/profile";
import { toggleFullscreen } from "@/lib/actions";
import { WORKSPACE } from "@/data/files";
import { keybindings, useKeybindingLabel } from "@/lib/platform";
import { useWorkbench } from "@/lib/store";
import { cn } from "@/lib/utils";

function TrafficLights() {
  const closeAll = useWorkbench((s) => s.closeAll);
  const toggleSidebar = useWorkbench((s) => s.toggleSidebar);

  const lights = [
    { label: "Close all editors", color: "#ff5f57", glyph: "×", onClick: closeAll },
    { label: "Toggle sidebar", color: "#febc2e", glyph: "−", onClick: toggleSidebar },
    { label: "Toggle full screen", color: "#28c840", glyph: "+", onClick: toggleFullscreen },
  ];

  return (
    <div className="group/lights flex items-center gap-2 pr-2 pl-3">
      {lights.map((l) => (
        <button
          key={l.label}
          type="button"
          aria-label={l.label}
          title={l.label}
          onClick={l.onClick}
          className="grid size-3 place-items-center rounded-full text-[10px] leading-none font-bold text-black/0 group-hover/lights:text-black/60"
          style={{ backgroundColor: l.color }}
        >
          <span aria-hidden className="-mt-px">
            {l.glyph}
          </span>
        </button>
      ))}
    </div>
  );
}

function LayoutToggle({
  label,
  shortcut,
  active,
  onClick,
  on: On,
  off: Off,
}: {
  label: string;
  shortcut: string;
  active: boolean;
  onClick: () => void;
  on: typeof VscLayoutPanel;
  off: typeof VscLayoutPanel;
}) {
  const Icon = active ? On : Off;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className="grid size-7 place-items-center rounded-md text-titlebar-foreground/80 hover:bg-titlebar-foreground/10 hover:text-titlebar-foreground"
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label} ({shortcut})
      </TooltipContent>
    </Tooltip>
  );
}

export function TitleBar() {
  const label = useKeybindingLabel();
  const openPalette = useWorkbench((s) => s.openPalette);
  const sidebarOpen = useWorkbench((s) => s.sidebarOpen);
  const mobileSidebarOpen = useWorkbench((s) => s.mobileSidebarOpen);
  const panelOpen = useWorkbench((s) => s.panelOpen);
  const toggleSidebar = useWorkbench((s) => s.toggleSidebar);
  const togglePanel = useWorkbench((s) => s.togglePanel);
  const chatOpen = useWorkbench((s) => s.chatOpen);
  const chatOverlayOpen = useWorkbench((s) => s.chatOverlayOpen);
  const toggleChat = useWorkbench((s) => s.toggleChat);

  return (
    <header className="relative flex h-9 shrink-0 items-center border-b border-line bg-titlebar text-titlebar-foreground select-none">
      <TrafficLights />

      <button
        type="button"
        onClick={() => openPalette("files")}
        className={cn(
          "absolute top-1/2 left-1/2 flex h-6 w-[min(440px,calc(100vw-15rem))] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 rounded-md border px-2",
          "border-titlebar-foreground/15 bg-titlebar-foreground/5 text-xs text-titlebar-foreground/80 hover:bg-titlebar-foreground/10 hover:text-titlebar-foreground",
        )}
      >
        <VscSearch aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate">
          <span className="hidden sm:inline">{profile.handle} — </span>
          {WORKSPACE}
        </span>
        <span className="sr-only">Search files ({label(keybindings.quickOpen)})</span>
      </button>

      <div className="ml-auto flex items-center gap-0.5 pr-2">
        <span className="max-md:hidden">
          <LayoutToggle
            label="Toggle Primary Side Bar"
            shortcut={label(keybindings.toggleSidebar)}
            active={sidebarOpen}
            onClick={toggleSidebar}
            on={VscLayoutSidebarLeft}
            off={VscLayoutSidebarLeftOff}
          />
        </span>
        <span className="md:hidden">
          <LayoutToggle
            label="Toggle Primary Side Bar"
            shortcut={label(keybindings.toggleSidebar)}
            active={mobileSidebarOpen}
            onClick={toggleSidebar}
            on={VscLayoutSidebarLeft}
            off={VscLayoutSidebarLeftOff}
          />
        </span>
        <LayoutToggle
          label="Toggle Panel"
          shortcut={label(keybindings.toggleTerminal)}
          active={panelOpen}
          onClick={() => togglePanel()}
          on={VscLayoutPanel}
          off={VscLayoutPanelOff}
        />
        {features.chat && (
          <>
            <span className="max-xl:hidden">
              <LayoutToggle
                label={`Toggle ${assistant.name}`}
                shortcut={label(keybindings.chat)}
                active={chatOpen}
                onClick={toggleChat}
                on={VscLayoutSidebarRight}
                off={VscLayoutSidebarRightOff}
              />
            </span>
            <span className="xl:hidden">
              <LayoutToggle
                label={`Toggle ${assistant.name}`}
                shortcut={label(keybindings.chat)}
                active={chatOverlayOpen}
                onClick={toggleChat}
                on={VscLayoutSidebarRight}
                off={VscLayoutSidebarRightOff}
              />
            </span>
          </>
        )}
      </div>
    </header>
  );
}
