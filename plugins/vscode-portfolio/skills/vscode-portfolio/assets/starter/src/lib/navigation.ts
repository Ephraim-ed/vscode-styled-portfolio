"use client";

import { resolveWorkspaceHref, tree } from "@/data/files";
import { openExternal } from "@/lib/actions";
import { useWorkbench } from "@/lib/store";

/** Follow a link found in file content: workspace paths open in the editor, the rest open externally. */
export function navigateHref(href: string) {
  const target = resolveWorkspaceHref(href);
  const { openFile, revealFolder, openView, openChat } = useWorkbench.getState();
  if (target?.type === "chat") {
    openChat();
  } else if (target?.type === "view") {
    openView(target.view);
  } else if (target?.type === "file") {
    openFile(target.path);
  } else if (target?.type === "folder") {
    revealFolder(target.path);
    const folder = tree.find((n) => n.type === "folder" && n.path === target.path);
    const first = folder?.type === "folder" ? folder.children[0] : undefined;
    if (first && !window.matchMedia("(max-width: 767px)").matches) openFile(first.path);
  } else if (href.startsWith("mailto:")) {
    window.location.href = href;
  } else if (/^https?:\/\//.test(href)) {
    openExternal(href);
  }
}
