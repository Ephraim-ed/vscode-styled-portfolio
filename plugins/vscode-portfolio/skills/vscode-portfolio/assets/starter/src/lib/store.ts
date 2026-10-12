"use client";

import { create } from "zustand";

import { HOME_PATH, folderPaths } from "@/data/files";
import { features } from "@/data/profile";
import { DEFAULT_THEME, THEME_STORAGE_KEY, getTheme, type ThemeId } from "@/data/themes";

export type SidebarView = "explorer" | "search" | "scm" | "extensions";
export type PanelTab = "problems" | "output" | "terminal";
export type PaletteMode = "files" | "commands" | "themes";

type Reveal = { path: string; line: number; nonce: number };
type TerminalRequest = { command: string; nonce: number };

type WorkbenchState = {
  openTabs: string[];
  activeTab: string | null;
  sidebarView: SidebarView;
  /** Desktop (md+) sidebar visibility. */
  sidebarOpen: boolean;
  /** Mobile overlay sidebar visibility. */
  mobileSidebarOpen: boolean;
  panelOpen: boolean;
  panelTab: PanelTab;
  /** The chat assistant (features.chat), docked on the right on wide screens (≥ 1280px). */
  chatOpen: boolean;
  /** The same chat as a slide-over on narrower screens. */
  chatOverlayOpen: boolean;
  /** themeBefore: the theme to restore if the color-theme picker is cancelled. */
  palette: { open: boolean; mode: PaletteMode; themeBefore: ThemeId | null };
  expanded: Record<string, boolean>;
  /** Markdown files open in preview; true here shows their source instead. */
  showSource: Record<string, boolean>;
  cursor: { line: number; col: number };
  reveal: Reveal | null;
  /** A folder revealed from a link (README's Projects card): the explorer makes it glow. `at` restarts the glow. */
  glow: { path: string; at: number } | null;
  terminalRequest: TerminalRequest | null;
  theme: ThemeId;

  openFile: (path: string, opts?: { line?: number }) => void;
  closeTab: (path: string) => void;
  closeOthers: (path: string) => void;
  closeAll: () => void;
  /** Activity bar click: shows the view, or collapses the sidebar if it's already showing. */
  showView: (view: SidebarView) => void;
  /** Always shows the view (used by shortcuts and commands). */
  openView: (view: SidebarView) => void;
  toggleSidebar: () => void;
  closeMobileSidebar: () => void;
  revealFolder: (path: string) => void;
  clearGlow: () => void;
  togglePanel: (tab?: PanelTab) => void;
  openPanel: (tab: PanelTab) => void;
  closePanel: () => void;
  runInTerminal: (command: string) => void;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  openPalette: (mode: PaletteMode) => void;
  closePalette: () => void;
  toggleFolder: (path: string) => void;
  collapseAll: () => void;
  togglePreview: (path: string) => void;
  setCursor: (line: number, col: number) => void;
  setTheme: (theme: ThemeId, opts?: { persist?: boolean }) => void;
};

const isMarkdown = (path: string) => path.endsWith(".md");

/** Whether a file is showing its rendered markdown preview (the default for .md files). */
export const isPreviewing = (s: Pick<WorkbenchState, "showSource">, path: string) =>
  isMarkdown(path) && !s.showSource[path];

const isWide = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches;

const isMobile = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

let nonce = 0;

export const useWorkbench = create<WorkbenchState>()((set, get) => ({
  openTabs: [HOME_PATH],
  activeTab: HOME_PATH,
  sidebarView: "explorer",
  sidebarOpen: true,
  mobileSidebarOpen: false,
  panelOpen: false,
  panelTab: "terminal",
  chatOpen: features.chat,
  chatOverlayOpen: false,
  palette: { open: false, mode: "files", themeBefore: null },
  expanded: Object.fromEntries(folderPaths.map((p) => [p, true])),
  showSource: {},
  cursor: { line: 1, col: 1 },
  reveal: null,
  glow: null,
  terminalRequest: null,
  theme: DEFAULT_THEME,

  openFile: (path, opts) =>
    set((s) => ({
      openTabs: s.openTabs.includes(path) ? s.openTabs : [...s.openTabs, path],
      activeTab: path,
      mobileSidebarOpen: false,
      cursor: { line: opts?.line ?? 1, col: 1 },
      reveal: opts?.line ? { path, line: opts.line, nonce: ++nonce } : s.reveal,
      // Jumping to a line (search, graph) needs the source view to show it.
      showSource: opts?.line && isMarkdown(path) ? { ...s.showSource, [path]: true } : s.showSource,
    })),

  closeTab: (path) =>
    set((s) => {
      const index = s.openTabs.indexOf(path);
      if (index === -1) return s;
      const openTabs = s.openTabs.filter((p) => p !== path);
      const activeTab =
        s.activeTab === path ? (openTabs[index] ?? openTabs[index - 1] ?? null) : s.activeTab;
      return { openTabs, activeTab };
    }),

  closeOthers: (path) => set({ openTabs: [path], activeTab: path }),
  closeAll: () => set({ openTabs: [], activeTab: null }),

  showView: (view) => {
    if (isMobile()) {
      const { mobileSidebarOpen, sidebarView } = get();
      set({ sidebarView: view, mobileSidebarOpen: !(mobileSidebarOpen && sidebarView === view) });
      return;
    }
    const { sidebarOpen, sidebarView } = get();
    // Clicking the active view's icon collapses the sidebar, like VS Code.
    set({ sidebarView: view, sidebarOpen: !(sidebarOpen && sidebarView === view) });
  },

  openView: (view) =>
    isMobile()
      ? set({ sidebarView: view, mobileSidebarOpen: true })
      : set({ sidebarView: view, sidebarOpen: true }),

  toggleSidebar: () =>
    isMobile()
      ? set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen }))
      : set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

  revealFolder: (path) =>
    set((s) => ({
      sidebarView: "explorer",
      sidebarOpen: true,
      mobileSidebarOpen: isMobile() ? true : s.mobileSidebarOpen,
      expanded: { ...s.expanded, [path]: true },
      glow: { path, at: Date.now() },
    })),
  clearGlow: () => set({ glow: null }),

  togglePanel: (tab) =>
    set((s) => {
      if (tab && s.panelOpen && s.panelTab !== tab) return { panelTab: tab };
      return { panelOpen: !s.panelOpen, panelTab: tab ?? s.panelTab };
    }),
  openPanel: (tab) => set({ panelOpen: true, panelTab: tab }),
  closePanel: () => set({ panelOpen: false }),

  runInTerminal: (command) =>
    set({
      panelOpen: true,
      panelTab: "terminal",
      terminalRequest: { command, nonce: ++nonce },
    }),

  toggleChat: () =>
    isWide() ? set((s) => ({ chatOpen: !s.chatOpen })) : set((s) => ({ chatOverlayOpen: !s.chatOverlayOpen })),
  openChat: () => (isWide() ? set({ chatOpen: true }) : set({ chatOverlayOpen: true, mobileSidebarOpen: false })),
  closeChat: () => set({ chatOpen: false, chatOverlayOpen: false }),

  openPalette: (mode) =>
    set((s) => ({
      palette: {
        open: true,
        mode,
        themeBefore: mode === "themes" ? (s.palette.themeBefore ?? s.theme) : null,
      },
    })),
  closePalette: () => set((s) => ({ palette: { ...s.palette, open: false, themeBefore: null } })),

  toggleFolder: (path) => set((s) => ({ expanded: { ...s.expanded, [path]: !s.expanded[path] } })),
  collapseAll: () => set({ expanded: {} }),

  togglePreview: (path) => set((s) => ({ showSource: { ...s.showSource, [path]: !s.showSource[path] } })),

  setCursor: (line, col) => set({ cursor: { line, col } }),

  setTheme: (theme, opts) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeType = getTheme(theme).type;
    if (opts?.persist !== false) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {}
    }
    set({ theme });
  },
}));
