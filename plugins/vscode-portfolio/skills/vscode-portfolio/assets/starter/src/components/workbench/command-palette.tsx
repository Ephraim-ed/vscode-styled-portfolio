"use client";

import { useEffect, useRef, useState } from "react";
import { Command as CommandPrimitive, defaultFilter } from "cmdk";
import { Dialog as DialogPrimitive } from "radix-ui";
import { VscCheck } from "react-icons/vsc";

import { HOME_PATH, basename, dirname } from "@/data/files";
import { assistant, features, profile } from "@/data/profile";
import { isThemeId, themes } from "@/data/themes";
import { composeEmail, copyToClipboard, openExternal, toggleFullscreen } from "@/lib/actions";
import { keybindings, useKeybindingLabel, type Keybinding } from "@/lib/platform";
import { useChat } from "@/lib/chat-store";
import { useSounds } from "@/lib/sounds";
import { useWorkbench, type PaletteMode } from "@/lib/store";
import { cn } from "@/lib/utils";

import { FileIcon } from "./file-icon";
import { useWorkspace } from "./workspace-context";

type PaletteCommand = {
  label: string;
  keybinding?: Keybinding;
  run: () => void;
  /** Commands that switch the palette to another mode keep it open. */
  keepOpen?: boolean;
};

const itemClass =
  "flex h-6 cursor-pointer items-center gap-2 rounded-[3px] px-2 text-[13px] text-popover-foreground data-[selected=true]:bg-quick-selected data-[selected=true]:text-quick-selected-foreground";

function getPaletteCommands(): PaletteCommand[] {
  const s = useWorkbench.getState();
  return [
    { label: "Go to File…", keybinding: keybindings.quickOpen, run: () => s.openPalette("files"), keepOpen: true },
    { label: "Preferences: Color Theme", run: () => s.openPalette("themes"), keepOpen: true },
    { label: "Preferences: Toggle Sounds", run: () => useSounds.getState().toggle() },
    { label: "View: Toggle Terminal", keybinding: keybindings.toggleTerminal, run: () => s.togglePanel("terminal") },
    { label: "View: Toggle Primary Side Bar Visibility", keybinding: keybindings.toggleSidebar, run: s.toggleSidebar },
    { label: "View: Show Explorer", keybinding: keybindings.explorer, run: () => s.openView("explorer") },
    { label: "View: Show Search", keybinding: keybindings.search, run: () => s.openView("search") },
    { label: "View: Show Source Control", keybinding: keybindings.scm, run: () => s.openView("scm") },
    { label: "View: Show Extensions (My skills)", keybinding: keybindings.extensions, run: () => s.openView("extensions") },
    { label: "View: Close All Editors", run: s.closeAll },
    { label: "View: Toggle Full Screen", run: toggleFullscreen },
    {
      label: "Markdown: Toggle Preview",
      keybinding: keybindings.markdownPreview,
      run: () => (s.activeTab?.endsWith(".md") ? s.togglePreview(s.activeTab) : s.openFile(HOME_PATH)),
    },
    { label: "Contact: Send Email", run: () => composeEmail() },
    { label: "Contact: Copy Email Address", run: () => copyToClipboard(profile.email, "Copied email address") },
    { label: "Contact: Open LinkedIn", run: () => openExternal(profile.links.linkedin) },
    { label: "Contact: Open GitHub", run: () => openExternal(profile.links.github) },
    ...(profile.links.extra
      ? [{ label: `Contact: Open ${profile.links.extra.label}`, run: () => openExternal(profile.links.extra!.url) }]
      : []),
    { label: "Terminal: Run neofetch", run: () => s.runInTerminal("neofetch") },
    ...(features.chat
      ? [
          { label: `${assistant.name}: Toggle Chat`, keybinding: keybindings.chat, run: s.toggleChat },
          {
            label: `${assistant.name}: New Chat`,
            run: () => {
              useChat.getState().reset();
              s.openChat();
            },
          },
        ]
      : []),
  ];
}

function PaletteBody({ mode, onDone }: { mode: PaletteMode; onDone: (confirmed: boolean) => void }) {
  const label = useKeybindingLabel();
  const { files } = useWorkspace();
  const openTabs = useWorkbench((s) => s.openTabs);
  const theme = useWorkbench((s) => s.theme);
  const openFile = useWorkbench((s) => s.openFile);
  const setTheme = useWorkbench((s) => s.setTheme);
  const commands = getPaletteCommands();
  const [query, setQuery] = useState(mode === "commands" ? ">" : "");
  const [selected, setSelected] = useState<string>(mode === "themes" ? theme : "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus with the caret after any ">" prefix (Radix's default focus would select it).
  useEffect(() => {
    const el = inputRef.current;
    el?.focus();
    el?.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const effective: PaletteMode = mode === "themes" ? "themes" : query.startsWith(">") ? "commands" : "files";
  const sortedFiles = [...files].sort(
    (a, b) => Number(openTabs.includes(b.path)) - Number(openTabs.includes(a.path)),
  );

  const placeholder = {
    files: "Search files by name (type > for commands)",
    commands: "Type the name of a command to run",
    themes: "Select Color Theme (Up/Down Keys to Preview)",
  }[effective];

  return (
    <CommandPrimitive
      label="Command Palette"
      loop
      value={selected}
      onValueChange={(v) => {
        setSelected(v);
        if (effective === "themes" && isThemeId(v)) setTheme(v, { persist: false });
      }}
      filter={(value, search, keywords) => {
        const q = search.replace(/^>\s*/, "");
        return q ? defaultFilter(value, q, keywords) : 1;
      }}
      className="flex flex-col"
    >
      <div className="p-1.5">
        <CommandPrimitive.Input
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          placeholder={placeholder}
          className="h-[26px] w-full rounded-[2px] border border-focus bg-field px-1.5 text-[13px] text-field-foreground outline-none placeholder:text-placeholder"
        />
      </div>
      <CommandPrimitive.List className="vsc-scroll max-h-[min(60vh,420px)] overflow-y-auto px-1.5 pb-1.5">
        <CommandPrimitive.Empty className="px-2 py-1 text-[13px] text-description">
          {effective === "commands" ? "No matching commands" : "No matching results"}
        </CommandPrimitive.Empty>

        {effective === "files" &&
          sortedFiles.map((f) => (
            <CommandPrimitive.Item
              key={f.path}
              value={f.path}
              keywords={[basename(f.path)]}
              onSelect={() => {
                openFile(f.path);
                onDone(true);
              }}
              className={itemClass}
            >
              <FileIcon name={basename(f.path)} />
              <span className="truncate">{basename(f.path)}</span>
              <span className="truncate text-xs opacity-70">{dirname(f.path) || "portfolio"}</span>
              {openTabs.includes(f.path) && <span className="ml-auto shrink-0 text-xs opacity-70">recently opened</span>}
            </CommandPrimitive.Item>
          ))}

        {effective === "commands" &&
          commands.map((c) => (
            <CommandPrimitive.Item
              key={c.label}
              value={c.label}
              onSelect={() => {
                if (c.keepOpen) {
                  c.run();
                  return;
                }
                onDone(true);
                c.run();
              }}
              className={itemClass}
            >
              <span className="truncate">{c.label}</span>
              {c.keybinding && (
                <kbd className="ml-auto shrink-0 font-sans text-xs opacity-80">{label(c.keybinding)}</kbd>
              )}
            </CommandPrimitive.Item>
          ))}

        {effective === "themes" &&
          (["light", "dark"] as const).map((type) => (
            <CommandPrimitive.Group
              key={type}
              heading={`${type} themes`}
              className="**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pt-1.5 **:[[cmdk-group-heading]]:pb-0.5 **:[[cmdk-group-heading]]:text-right **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:text-link"
            >
              {themes
                .filter((t) => t.type === type)
                .map((t) => (
                  <CommandPrimitive.Item
                    key={t.id}
                    value={t.id}
                    keywords={[t.label]}
                    onSelect={() => {
                      setTheme(t.id);
                      onDone(true);
                    }}
                    className={itemClass}
                  >
                    {t.label}
                    {t.id === theme && <VscCheck aria-hidden className="ml-auto size-3.5" />}
                  </CommandPrimitive.Item>
                ))}
            </CommandPrimitive.Group>
          ))}
      </CommandPrimitive.List>
    </CommandPrimitive>
  );
}

export function CommandPalette() {
  const { open, mode } = useWorkbench((s) => s.palette);
  const closePalette = useWorkbench((s) => s.closePalette);
  const setTheme = useWorkbench((s) => s.setTheme);
  const [session, setSession] = useState(0);

  const done = (confirmed: boolean) => {
    // Escape / click-away reverts the live theme preview.
    const { themeBefore } = useWorkbench.getState().palette;
    if (!confirmed && themeBefore) setTheme(themeBefore, { persist: false });
    setSession((n) => n + 1);
    closePalette();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && done(false)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "fixed top-11 left-1/2 z-50 w-[min(600px,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-md border border-widget-border bg-widget shadow-[0_0_8px_2px_rgba(0,0,0,0.36)] outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Command Palette</DialogPrimitive.Title>
          <PaletteBody key={`${session}-${mode}`} mode={mode} onDone={done} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
