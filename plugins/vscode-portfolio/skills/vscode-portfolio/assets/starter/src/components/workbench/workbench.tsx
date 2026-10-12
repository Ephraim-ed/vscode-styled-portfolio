"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HOME_PATH } from "@/data/files";
import { features, profile } from "@/data/profile";
import { isThemeId } from "@/data/themes";
import type { HighlightedFile } from "@/lib/highlight";
import { installSounds } from "@/lib/sounds";
import { useWorkbench } from "@/lib/store";

import { ActivityBar } from "./activity-bar";
import { ChatPanel } from "./chat/chat-panel";
import { CommandPalette } from "./command-palette";
import { EditorGroup } from "./editor/editor-group";
import { Panel } from "./panel/panel";
import { Sidebar } from "./sidebar/sidebar";
import { Shutdown } from "./shutdown";
import { StatusBar } from "./status-bar";
import { TitleBar } from "./title-bar";
import { WorkspaceProvider, useWorkspace } from "./workspace-context";

function useGlobalShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = useWorkbench.getState();
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const run = (fn: () => void) => {
        e.preventDefault();
        fn();
      };

      if (e.key === "F1" || (mod && e.shiftKey && key === "p")) return run(() => s.openPalette("commands"));
      if (mod && !e.shiftKey && (key === "p" || key === "k")) return run(() => s.openPalette("files"));
      if (e.ctrlKey && e.code === "Backquote") return run(() => s.togglePanel("terminal"));
      if (mod && !e.shiftKey && key === "j") return run(() => s.togglePanel());
      // ⌥⌘B / Ctrl+Alt+B (Option changes e.key on macOS, so match the physical key).
      if (features.chat && mod && e.altKey && e.code === "KeyB") return run(s.toggleChat);
      if (mod && !e.shiftKey && key === "b") return run(s.toggleSidebar);
      if (mod && e.shiftKey && key === "e") return run(() => s.openView("explorer"));
      if (mod && e.shiftKey && key === "f") return run(() => s.openView("search"));
      if (e.ctrlKey && e.shiftKey && key === "g") return run(() => s.openView("scm"));
      if (mod && e.shiftKey && key === "x") return run(() => s.openView("extensions"));
      if (mod && e.shiftKey && key === "v" && s.activeTab?.endsWith(".md")) {
        return run(() => s.togglePreview(s.activeTab!));
      }
      if (e.key === "Escape" && s.mobileSidebarOpen) s.closeMobileSidebar();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

/** Keeps the active file in the URL hash (#about.tsx) so links to a file can be shared. */
function useHashSync() {
  const { byPath } = useWorkspace();
  useEffect(() => {
    const openFromHash = () => {
      const path = decodeURIComponent(window.location.hash.slice(1));
      // skills.json became the Extensions (My skills) view; keep old links working.
      if (path === "skills.json") useWorkbench.getState().openView("extensions");
      else if (path && byPath.has(path)) useWorkbench.getState().openFile(path);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    const unsubscribe = useWorkbench.subscribe((s, prev) => {
      if (s.activeTab === prev.activeTab) return;
      const { pathname, search } = window.location;
      const hash = s.activeTab && s.activeTab !== HOME_PATH ? `#${s.activeTab}` : "";
      window.history.replaceState(null, "", `${pathname}${search}${hash}`);
    });
    return () => {
      window.removeEventListener("hashchange", openFromHash);
      unsubscribe();
    };
  }, [byPath]);
}

function useWelcomeNotification() {
  useEffect(() => {
    // The pre-paint script in layout.tsx already applied the saved theme; sync the store with it.
    const theme = document.documentElement.dataset.theme;
    if (isThemeId(theme)) useWorkbench.setState({ theme });

    try {
      if (sessionStorage.getItem("welcomed")) return;
      sessionStorage.setItem("welcomed", "1");
    } catch {}
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const timer = setTimeout(() => {
      toast.info(`Welcome to ${profile.firstName}'s portfolio`, {
        description: isTouch
          ? "Tap the icons on the left to explore, or try the terminal."
          : `Browse the files, press ${isMac ? "⌘P" : "Ctrl+P"} to jump anywhere, or take the interactive tour in the terminal.`,
        duration: isTouch ? 6000 : 12000,
        action: { label: "Open Terminal", onClick: () => useWorkbench.getState().runInTerminal("help") },
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, []);
}

function Shell() {
  useGlobalShortcuts();
  useHashSync();
  useWelcomeNotification();
  useEffect(() => installSounds(), []);

  return (
    <div className="workbench-root relative flex h-dvh flex-col overflow-hidden bg-editor text-editor-foreground">
      <h1 className="sr-only">
        {profile.name} — {profile.role} portfolio
      </h1>
      <TitleBar />
      <div className="relative flex min-h-0 flex-1">
        <ActivityBar />
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <EditorGroup />
          <Panel />
        </main>
        <ChatPanel />
      </div>
      <StatusBar />
      <CommandPalette />
      <Toaster position="bottom-right" offset={{ bottom: 32, right: 12 }} mobileOffset={{ bottom: 32 }} />
    </div>
  );
}

export function Workbench({ files }: { files: HighlightedFile[] }) {
  return (
    <WorkspaceProvider files={files}>
      <TooltipProvider delayDuration={400}>
        <Shell />
        {features.easterEggs && <Shutdown />}
      </TooltipProvider>
    </WorkspaceProvider>
  );
}
