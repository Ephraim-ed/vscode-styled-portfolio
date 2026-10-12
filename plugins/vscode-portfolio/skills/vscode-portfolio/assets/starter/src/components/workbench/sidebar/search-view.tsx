"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { VscCaseSensitive, VscChevronRight, VscWholeWord } from "react-icons/vsc";

import { asciiArtLines, basename, dirname } from "@/data/files";
import { profile, projects } from "@/data/profile";
import { useWorkbench } from "@/lib/store";
import { cn } from "@/lib/utils";

import { FileIcon } from "../file-icon";
import { useWorkspace } from "../workspace-context";

/** Search terms offered on the empty view: the core stack, then a project. */
const SUGGESTIONS = [...profile.coreStack.slice(0, 4), ...projects.slice(0, 2).map((p) => p.name)];

// Survives the view being unmounted when switching sidebar views.
const persisted = { query: "", matchCase: false, wholeWord: false };

type Match = { line: number; start: number; end: number; text: string };

function Toggle({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-5 place-items-center rounded-sm border border-transparent text-field-foreground/80 hover:bg-list-hover",
        active && "border-focus bg-focus/25 text-field-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Snippet({ match }: { match: Match }) {
  const { text, start, end } = match;
  const lead = text.slice(0, start).trimStart();
  const before = lead.length > 24 ? `…${lead.slice(-22)}` : lead;
  return (
    <span className="truncate">
      {before}
      <mark className="rounded-[2px] bg-match text-inherit">{text.slice(start, end)}</mark>
      {text.slice(end, end + 80)}
    </span>
  );
}

export function SearchView() {
  const { files } = useWorkspace();
  const openFile = useWorkbench((s) => s.openFile);
  const [query, setQuery] = useState(persisted.query);
  const [matchCase, setMatchCase] = useState(persisted.matchCase);
  const [wholeWord, setWholeWord] = useState(persisted.wholeWord);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    Object.assign(persisted, { query, matchCase, wholeWord });
  }, [query, matchCase, wholeWord]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(wholeWord ? `(?<![\\w])${escaped}(?![\\w])` : escaped, matchCase ? "g" : "gi");
    return files
      .map((file) => {
        const matches: Match[] = [];
        const art = asciiArtLines(file.source);
        file.source.split("\n").forEach((text, i) => {
          if (art.has(i + 1)) return; // the portrait is letters, but not words
          for (const m of text.matchAll(re)) {
            matches.push({ line: i + 1, start: m.index, end: m.index + m[0].length, text });
          }
        });
        return { file, matches };
      })
      .filter((r) => r.matches.length);
  }, [files, query, matchCase, wholeWord]);

  const total = results.reduce((n, r) => n + r.matches.length, 0);

  return (
    <div className="flex flex-col gap-2 px-3 pt-1 pb-3">
      <div className="flex h-[26px] items-center rounded-[2px] border border-field-border bg-field pr-1 focus-within:border-focus">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search"
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent px-1.5 text-[13px] text-field-foreground outline-none placeholder:text-placeholder"
        />
        <Toggle label="Match Case" active={matchCase} onClick={() => setMatchCase((v) => !v)}>
          <VscCaseSensitive className="size-4" />
        </Toggle>
        <Toggle label="Match Whole Word" active={wholeWord} onClick={() => setWholeWord((v) => !v)}>
          <VscWholeWord className="size-4" />
        </Toggle>
      </div>

      {!query.trim() ? (
        <div className="space-y-2 pt-1 text-[13px] text-description">
          <p>Search across every file in this portfolio.</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s)}
                className="rounded-sm border border-field-border px-1.5 py-0.5 text-xs text-side-foreground hover:bg-list-hover"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-description" aria-live="polite">
            {total ? `${total} result${total === 1 ? "" : "s"} in ${results.length} file${results.length === 1 ? "" : "s"}` : "No results found."}
          </p>
          <ul className="-mx-3">
            {results.map(({ file, matches }) => {
              const isCollapsed = collapsed[file.path];
              return (
                <li key={file.path}>
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => setCollapsed((c) => ({ ...c, [file.path]: !c[file.path] }))}
                    className="flex h-[22px] w-full items-center gap-1 pr-3 pl-2 text-left text-[13px] hover:bg-list-hover"
                  >
                    <VscChevronRight className={cn("size-4 shrink-0 transition-transform", !isCollapsed && "rotate-90")} />
                    <FileIcon name={file.path} />
                    <span className="truncate">{basename(file.path)}</span>
                    <span className="truncate text-xs text-description">{dirname(file.path)}</span>
                    <span className="ml-auto rounded-full bg-badge px-1.5 text-[11px] leading-4 text-badge-foreground">
                      {matches.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <ul>
                      {matches.map((m) => (
                        <li key={`${m.line}:${m.start}`}>
                          <button
                            type="button"
                            onClick={() => openFile(file.path, { line: m.line })}
                            className="flex h-[22px] w-full items-center pr-3 pl-10 text-left text-[13px] hover:bg-list-hover"
                          >
                            <Snippet match={m} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
