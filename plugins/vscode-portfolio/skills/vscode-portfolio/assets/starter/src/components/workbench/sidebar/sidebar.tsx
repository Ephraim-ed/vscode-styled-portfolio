"use client";

import { useRef, useState, type CSSProperties } from "react";

import { features } from "@/data/profile";
import { useWorkbench, type SidebarView } from "@/lib/store";
import { cn } from "@/lib/utils";

import { ExplorerView } from "./explorer-view";
import { ExtensionsView } from "./extensions-view";
import { GithubPane } from "./github-activity";
import { ScmView } from "./scm-view";
import { SearchView } from "./search-view";

const titles: Record<SidebarView, string> = {
  explorer: "Explorer",
  search: "Search",
  scm: "Source Control",
  extensions: "Extensions (My skills)",
};

const MIN_WIDTH = 170;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 260;

export function Sidebar() {
  const view = useWorkbench((s) => s.sidebarView);
  const sidebarOpen = useWorkbench((s) => s.sidebarOpen);
  const mobileSidebarOpen = useWorkbench((s) => s.mobileSidebarOpen);
  const closeMobileSidebar = useWorkbench((s) => s.closeMobileSidebar);
  const toggleSidebar = useWorkbench((s) => s.toggleSidebar);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; width: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, width };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const next = drag.current.width + e.clientX - drag.current.x;
    // Dragging well past the minimum collapses the sidebar, like VS Code.
    if (next < MIN_WIDTH - 60) {
      drag.current = null;
      setDragging(false);
      setWidth(DEFAULT_WIDTH);
      toggleSidebar();
      return;
    }
    setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
  };
  const onPointerUp = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <>
      {mobileSidebarOpen && (
        <div
          aria-hidden
          onClick={closeMobileSidebar}
          className="absolute inset-y-0 right-0 left-12 z-30 bg-black/40 md:hidden"
        />
      )}
      <aside
        aria-label={titles[view]}
        style={{ "--sidebar-width": `${width}px` } as CSSProperties}
        onKeyDown={(e) => e.key === "Escape" && closeMobileSidebar()}
        className={cn(
          "relative shrink-0 flex-col border-r border-line bg-side text-side-foreground",
          "max-md:absolute max-md:inset-y-0 max-md:left-12 max-md:z-40 max-md:w-[min(calc(100vw-4.5rem),320px)] max-md:shadow-2xl",
          "md:w-(--sidebar-width)",
          mobileSidebarOpen ? "max-md:flex" : "max-md:hidden",
          sidebarOpen ? "md:flex" : "md:hidden",
        )}
      >
        <div className="flex h-[35px] shrink-0 items-center px-5 text-[11px] tracking-wide text-side-title uppercase">
          {titles[view]}
        </div>
        <div className="vsc-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {view === "explorer" && <ExplorerView />}
          {view === "search" && <SearchView />}
          {view === "scm" && <ScmView />}
          {view === "extensions" && <ExtensionsView />}
        </div>
        {features.githubActivity && <GithubPane />}

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
          className={cn(
            "absolute inset-y-0 -right-[3px] z-20 w-1.5 cursor-ew-resize touch-none transition-colors delay-150 hover:bg-focus max-md:hidden",
            dragging && "bg-focus",
          )}
        />
      </aside>
    </>
  );
}
