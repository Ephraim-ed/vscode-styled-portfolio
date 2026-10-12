"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { create } from "zustand";

import { basename } from "@/data/files";
import { useWorkbench } from "@/lib/store";

import { useWorkspace } from "../workspace-context";
import { commands, completions, type CommandContext } from "./commands";

type Entry = { id: number; cwd?: string; input?: string; output?: ReactNode };

/** Terminal session state lives outside the component so it survives the panel closing. */
const useSession = create<{
  entries: Entry[];
  history: string[];
  cwd: string;
  push: (entry: Omit<Entry, "id">) => void;
  clear: () => void;
  setCwd: (cwd: string) => void;
  remember: (cmd: string) => void;
}>()((set) => {
  let id = 0;
  return {
    entries: [],
    history: [],
    cwd: "",
    push: (entry) => set((s) => ({ entries: [...s.entries, { ...entry, id: ++id }] })),
    clear: () => set({ entries: [] }),
    setCwd: (cwd) => set({ cwd }),
    remember: (cmd) => set((s) => ({ history: [...s.history, cmd] })),
  };
});

// Module-level so a remounted terminal doesn't replay the last request.
let handledRequest = 0;

function Prompt({ cwd }: { cwd: string }) {
  return (
    <span className="shrink-0 font-bold whitespace-pre">
      <span className="text-ansi-green">➜ </span>
      <span className="text-ansi-cyan"> {cwd ? basename(cwd) : "portfolio"}</span>
      <span className="text-ansi-blue"> git:(</span>
      <span className="text-ansi-red">main</span>
      <span className="text-ansi-blue">)</span>{" "}
    </span>
  );
}

const banner = (
  <div className="mb-1">
    <p>Welcome to the portfolio terminal.</p>
    <p className="opacity-60">
      Type <span className="text-ansi-green">help</span> for commands, or try{" "}
      <span className="text-ansi-green">neofetch</span>, <span className="text-ansi-green">projects</span>,{" "}
      <span className="text-ansi-green">contact</span>.
    </p>
  </div>
);

export function Terminal({ active }: { active: boolean }) {
  const { files } = useWorkspace();
  const { entries, history, cwd, push, clear, setCwd, remember } = useSession();
  const terminalRequest = useWorkbench((s) => s.terminalRequest);
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const run = (raw: string) => {
    const line = raw.trim();
    const { cwd } = useSession.getState();
    if (!line) {
      push({ cwd, input: "" });
      return;
    }
    remember(line);
    const [name, ...args] = line.split(/\s+/);
    const command = commands[name];
    if (name === "clear") {
      clear();
      return;
    }
    const ctx: CommandContext = {
      args,
      cwd,
      setCwd,
      files,
      history: [...useSession.getState().history],
      clear,
    };
    const output = command ? (
      (command.run(ctx) ?? null)
    ) : (
      <p>
        <span className="text-ansi-red">zsh: command not found: {name}</span>
        <span className="opacity-60"> — type `help` for a list of commands.</span>
      </p>
    );
    push({ cwd, input: line, output });
  };

  // Commands sent from elsewhere in the UI (e.g. "Open in Integrated Terminal").
  useEffect(() => {
    if (!terminalRequest || handledRequest === terminalRequest.nonce) return;
    handledRequest = terminalRequest.nonce;
    run(terminalRequest.command);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalRequest]);

  useEffect(() => {
    if (active) inputRef.current?.focus({ preventScroll: true });
  }, [active]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      run(input);
      setInput("");
      setHistoryIndex(null);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      if (!history.length) return;
      const next =
        e.key === "ArrowUp"
          ? Math.max(0, (historyIndex ?? history.length) - 1)
          : (historyIndex ?? history.length) + 1;
      if (next >= history.length) {
        setHistoryIndex(null);
        setInput("");
      } else {
        setHistoryIndex(next);
        setInput(history[next]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const options = completions(input, cwd);
      if (options.length === 1) {
        setInput(options[0] + (options[0].endsWith("/") ? "" : " "));
      } else if (options.length > 1) {
        push({
          cwd,
          input,
          output: <p className="flex flex-wrap gap-x-4">{options.map((o) => <span key={o}>{o.split(" ").pop()}</span>)}</p>,
        });
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      clear();
    } else if (e.key === "c" && e.ctrlKey && !window.getSelection()?.toString()) {
      e.preventDefault();
      push({ cwd, input: `${input}^C` });
      setInput("");
    }
  };

  return (
    <div
      ref={scrollRef}
      onClick={() => !window.getSelection()?.toString() && inputRef.current?.focus({ preventScroll: true })}
      className="vsc-scroll h-full overflow-y-auto px-4 py-2 font-mono text-[13px] leading-[1.45] text-terminal-foreground"
    >
      {banner}
      {entries.map((entry) => (
        <div key={entry.id}>
          {entry.input !== undefined && (
            <div className="flex flex-wrap">
              <Prompt cwd={entry.cwd ?? ""} />
              <span className="break-all whitespace-pre-wrap">{entry.input}</span>
            </div>
          )}
          {entry.output && <div className="mb-1 break-words">{entry.output}</div>}
        </div>
      ))}
      <div className="flex items-center">
        <Prompt cwd={cwd} />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setHistoryIndex(null);
          }}
          onKeyDown={onKeyDown}
          aria-label="Terminal input"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          className="min-w-0 flex-1 bg-transparent text-terminal-foreground caret-terminal-foreground outline-none"
        />
      </div>
    </div>
  );
}
