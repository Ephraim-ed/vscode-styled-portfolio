"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { HighlightedFile } from "@/lib/highlight";

type Workspace = {
  files: HighlightedFile[];
  byPath: Map<string, HighlightedFile>;
};

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({ files, children }: { files: HighlightedFile[]; children: ReactNode }) {
  const value = useMemo(() => ({ files, byPath: new Map(files.map((f) => [f.path, f])) }), [files]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}
