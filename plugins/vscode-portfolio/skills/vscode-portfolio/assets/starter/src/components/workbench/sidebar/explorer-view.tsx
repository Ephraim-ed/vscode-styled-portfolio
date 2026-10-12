"use client";

import { useEffect, useRef } from "react";
import { VscChevronRight, VscClose, VscCollapseAll } from "react-icons/vsc";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { WORKSPACE, basename, dirname, tree, type TreeNode } from "@/data/files";
import { copyToClipboard, fileLink } from "@/lib/actions";
import { useWorkbench } from "@/lib/store";
import { cn } from "@/lib/utils";

import { FileIcon, FolderIcon } from "../file-icon";
import { Section, SectionAction } from "./section";

const INDENT = 12;
const rowClass =
  "flex h-[22px] w-full items-center gap-1.5 pr-3 text-left text-[13px] hover:bg-list-hover focus-visible:outline-offset-[-1px]";

function FileContextMenu({ path, children }: { path: string; children: React.ReactNode }) {
  const openFile = useWorkbench((s) => s.openFile);
  const runInTerminal = useWorkbench((s) => s.runInTerminal);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={() => openFile(path)}>Open</ContextMenuItem>
        <ContextMenuItem onSelect={() => runInTerminal(`cat ${path}`)}>Open in Integrated Terminal</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => copyToClipboard(path, "Copied relative path")}>
          Copy Relative Path
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => copyToClipboard(fileLink(path), "Copied link to file")}>
          Copy Link
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const expanded = useWorkbench((s) => !!s.expanded[node.path]);
  const active = useWorkbench((s) => s.activeTab === node.path);
  const glowAt = useWorkbench((s) => (s.glow?.path === node.path ? s.glow.at : 0));
  const toggleFolder = useWorkbench((s) => s.toggleFolder);
  const openFile = useWorkbench((s) => s.openFile);
  const clearGlow = useWorkbench((s) => s.clearGlow);
  const item = useRef<HTMLLIElement>(null);

  // Revealed from a link: bring the folder into view while it glows.
  useEffect(() => {
    if (glowAt) item.current?.scrollIntoView({ block: "nearest" });
  }, [glowAt]);

  if (node.type === "folder") {
    return (
      <li ref={item} role="treeitem" aria-expanded={expanded} aria-selected={false} className="relative">
        {glowAt > 0 && <span key={glowAt} aria-hidden className="explorer-glow" onAnimationEnd={clearGlow} />}
        <button
          type="button"
          onClick={() => toggleFolder(node.path)}
          className={rowClass}
          style={{ paddingLeft: 4 + depth * INDENT }}
        >
          <VscChevronRight
            aria-hidden
            className={cn("size-4 shrink-0 transition-transform", expanded && "rotate-90")}
          />
          <FolderIcon open={expanded} />
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && (
          <ul role="group" className="relative">
            <span
              aria-hidden
              className="absolute inset-y-0 w-px bg-side-foreground/15"
              style={{ left: 11 + depth * INDENT }}
            />
            {node.children.map((child) => (
              <TreeRow key={child.path} node={child} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li role="treeitem" aria-selected={active}>
      <FileContextMenu path={node.path}>
        <button
          type="button"
          onClick={() => openFile(node.path)}
          className={cn(rowClass, active && "bg-list-active text-list-active-foreground hover:bg-list-active")}
          style={{ paddingLeft: 4 + depth * INDENT + 18 }}
        >
          <FileIcon name={node.name} />
          <span className="truncate">{node.name}</span>
        </button>
      </FileContextMenu>
    </li>
  );
}

function OpenEditors() {
  const openTabs = useWorkbench((s) => s.openTabs);
  const activeTab = useWorkbench((s) => s.activeTab);
  const openFile = useWorkbench((s) => s.openFile);
  const closeTab = useWorkbench((s) => s.closeTab);

  if (!openTabs.length) {
    return <p className="px-6 py-1 text-[13px] text-description">No open editors</p>;
  }
  return (
    <ul className="pb-1">
      {openTabs.map((path) => (
        <li key={path} className="group/editor relative">
          <button
            type="button"
            onClick={() => openFile(path)}
            className={cn(
              rowClass,
              "pl-6",
              path === activeTab && "bg-list-active text-list-active-foreground hover:bg-list-active",
            )}
          >
            <FileIcon name={basename(path)} />
            <span className="truncate">{basename(path)}</span>
            {dirname(path) && <span className="truncate text-xs text-description">{dirname(path)}</span>}
          </button>
          <button
            type="button"
            aria-label={`Close ${basename(path)}`}
            onClick={() => closeTab(path)}
            className="absolute top-[3px] left-1 grid size-4 place-items-center rounded-sm opacity-0 group-hover/editor:opacity-100 hover:bg-list-hover focus-visible:opacity-100 max-md:opacity-100"
          >
            <VscClose className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ExplorerView() {
  const collapseAll = useWorkbench((s) => s.collapseAll);
  return (
    <>
      <Section title="Open Editors" defaultOpen={false}>
        <OpenEditors />
      </Section>
      <Section
        title={WORKSPACE}
        actions={
          <SectionAction label="Collapse Folders in Explorer" onClick={collapseAll}>
            <VscCollapseAll className="size-4" />
          </SectionAction>
        }
      >
        <ul role="tree" aria-label="Files" className="pb-2">
          {tree.map((node) => (
            <TreeRow key={node.path} node={node} depth={0} />
          ))}
        </ul>
      </Section>
    </>
  );
}
