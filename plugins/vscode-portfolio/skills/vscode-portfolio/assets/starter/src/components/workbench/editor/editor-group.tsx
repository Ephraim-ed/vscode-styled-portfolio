"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { VscChevronRight, VscClose, VscCode, VscEllipsis, VscOpenPreview } from "react-icons/vsc";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WORKSPACE, basename, dirname } from "@/data/files";
import { copyToClipboard, fileLink } from "@/lib/actions";
import { keybindings, useKeybindingLabel } from "@/lib/platform";
import { isPreviewing, useWorkbench } from "@/lib/store";
import { cn } from "@/lib/utils";

import { FileIcon, FolderIcon } from "../file-icon";
import { useWorkspace } from "../workspace-context";
import { CodeView } from "./code-view";
import { EmptyEditor } from "./empty-editor";
import { MarkdownPreview } from "./markdown-preview";

function Tab({ path, active }: { path: string; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const openFile = useWorkbench((s) => s.openFile);
  const closeTab = useWorkbench((s) => s.closeTab);
  const closeOthers = useWorkbench((s) => s.closeOthers);
  const closeAll = useWorkbench((s) => s.closeAll);
  const revealFolder = useWorkbench((s) => s.revealFolder);
  const preview = useWorkbench((s) => isPreviewing(s, path));
  const name = basename(path);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={ref}
          role="tab"
          tabIndex={active ? 0 : -1}
          aria-selected={active}
          title={path}
          onClick={() => openFile(path)}
          onAuxClick={(e) => e.button === 1 && closeTab(path)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openFile(path);
            if (e.key === "Delete" || e.key === "Backspace") closeTab(path);
          }}
          className={cn(
            "group/tab relative flex h-full shrink-0 cursor-pointer items-center gap-1.5 border-r border-tab-border pr-1 pl-3 text-[13px] select-none",
            active ? "bg-tab-active text-tab-active-foreground" : "bg-tab text-tab-foreground hover:text-tab-active-foreground/90",
          )}
        >
          {active && <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-tab-active-border" />}
          <FileIcon name={name} />
          <span className="whitespace-nowrap">
            {preview ? `Preview ${name}` : name}
          </span>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Close ${name}`}
            onClick={(e) => {
              e.stopPropagation();
              closeTab(path);
            }}
            className={cn(
              "grid size-5 place-items-center rounded-sm opacity-0 group-hover/tab:opacity-100 hover:bg-list-hover max-md:opacity-100",
              active && "opacity-100",
            )}
          >
            <VscClose className="size-4" />
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={() => closeTab(path)}>Close</ContextMenuItem>
        <ContextMenuItem onSelect={() => closeOthers(path)}>Close Others</ContextMenuItem>
        <ContextMenuItem onSelect={closeAll}>Close All</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => copyToClipboard(path, "Copied relative path")}>Copy Relative Path</ContextMenuItem>
        <ContextMenuItem onSelect={() => copyToClipboard(fileLink(path), "Copied link to file")}>Copy Link</ContextMenuItem>
        <ContextMenuItem onSelect={() => revealFolder(dirname(path))}>Reveal in Explorer View</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function EditorActions({ path }: { path: string }) {
  const label = useKeybindingLabel();
  const { byPath } = useWorkspace();
  const preview = useWorkbench((s) => isPreviewing(s, path));
  const togglePreview = useWorkbench((s) => s.togglePreview);
  const closeAll = useWorkbench((s) => s.closeAll);
  const openPalette = useWorkbench((s) => s.openPalette);
  const file = byPath.get(path);
  const isMarkdown = file?.lang === "markdown";

  return (
    <div className="flex shrink-0 items-center gap-0.5 px-1.5">
      {isMarkdown && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={preview ? "Show Source" : "Open Preview"}
              onClick={() => togglePreview(path)}
              className="grid size-6 place-items-center rounded-md text-tab-active-foreground/80 hover:bg-list-hover"
            >
              {preview ? <VscCode className="size-4" /> : <VscOpenPreview className="size-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {preview ? "Show Source" : "Open Preview"} ({label(keybindings.markdownPreview)})
          </TooltipContent>
        </Tooltip>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More Actions…"
            className="grid size-6 place-items-center rounded-md text-tab-active-foreground/80 hover:bg-list-hover"
          >
            <VscEllipsis className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => copyToClipboard(fileLink(path), "Copied link to file")}>
            Copy Link to File
          </DropdownMenuItem>
          {file && (
            <DropdownMenuItem onSelect={() => copyToClipboard(file.source, `Copied ${basename(path)}`)}>
              Copy File Contents
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openPalette("themes")}>Color Theme…</DropdownMenuItem>
          <DropdownMenuItem onSelect={closeAll}>Close All</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Breadcrumbs({ path }: { path: string }) {
  const revealFolder = useWorkbench((s) => s.revealFolder);
  const dir = dirname(path);
  const crumb = "flex items-center gap-1 rounded-sm px-0.5 hover:text-editor-foreground";
  return (
    <nav
      aria-label="Breadcrumbs"
      className="no-scrollbar flex h-[22px] shrink-0 items-center overflow-x-auto px-3 text-[13px] whitespace-nowrap text-breadcrumb"
    >
      <button type="button" className={crumb} onClick={() => revealFolder("")}>
        {WORKSPACE}
      </button>
      {dir && (
        <>
          <VscChevronRight aria-hidden className="size-4 shrink-0" />
          <button type="button" className={crumb} onClick={() => revealFolder(dir)}>
            <FolderIcon className="size-3.5" open />
            {dir}
          </button>
        </>
      )}
      <VscChevronRight aria-hidden className="size-4 shrink-0" />
      <span className="flex items-center gap-1 px-0.5">
        <FileIcon name={basename(path)} className="size-3.5" />
        {basename(path)}
      </span>
    </nav>
  );
}

export function EditorGroup() {
  const { byPath } = useWorkspace();
  const openTabs = useWorkbench((s) => s.openTabs);
  const activeTab = useWorkbench((s) => s.activeTab);
  const preview = useWorkbench((s) => (s.activeTab ? isPreviewing(s, s.activeTab) : false));
  const file = activeTab ? byPath.get(activeTab) : undefined;

  if (!file) {
    return (
      <section aria-label="Editor" className="flex min-h-0 flex-1 flex-col bg-editor">
        <EmptyEditor />
      </section>
    );
  }

  return (
    <section aria-label="Editor" className="flex min-h-0 flex-1 flex-col bg-editor">
      <div className="flex h-[35px] shrink-0 bg-tabs">
        <div role="tablist" aria-label="Open editors" className="no-scrollbar flex min-w-0 flex-1 overflow-x-auto">
          {openTabs.map((path) => (
            <Tab key={path} path={path} active={path === activeTab} />
          ))}
        </div>
        <EditorActions path={file.path} />
      </div>
      <Breadcrumbs path={file.path} />
      <motion.div
        key={`${file.path}:${preview}`}
        role="tabpanel"
        aria-label={file.path}
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
        className="flex min-h-0 flex-1 flex-col"
      >
        {preview ? (
          <MarkdownPreview source={file.source} />
        ) : (
          <CodeView file={file} />
        )}
      </motion.div>
    </section>
  );
}
