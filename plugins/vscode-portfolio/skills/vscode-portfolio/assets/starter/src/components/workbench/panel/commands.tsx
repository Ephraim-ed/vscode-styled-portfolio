"use client";

import type { ReactNode } from "react";

import { basename, folderPaths, resolveWorkspaceHref, tree } from "@/data/files";
import { monogramArt } from "@/data/monogram-art";
import { assistant, education, experience, features, profile, projects, skills } from "@/data/profile";
import { getTheme, themes } from "@/data/themes";
import { composeEmail, openExternal } from "@/lib/actions";
import type { HighlightedFile } from "@/lib/highlight";
import { useChat } from "@/lib/chat-store";
import { useWorkbench } from "@/lib/store";

export type CommandContext = {
  args: string[];
  cwd: string;
  setCwd: (cwd: string) => void;
  files: HighlightedFile[];
  history: string[];
  clear: () => void;
};

type Command = {
  description: string;
  usage?: string;
  hidden?: boolean;
  run: (ctx: CommandContext) => ReactNode | void;
};

/* ---------- output helpers ---------- */

const C = {
  green: "text-ansi-green",
  blue: "text-ansi-blue",
  cyan: "text-ansi-cyan",
  yellow: "text-ansi-yellow",
  red: "text-ansi-red",
  magenta: "text-ansi-magenta",
  dim: "opacity-60",
};

export function TermLink({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="text-ansi-cyan underline underline-offset-2 hover:opacity-80"
    >
      {children ?? href}
    </a>
  );
}

function FileButton({ path, children }: { path: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => useWorkbench.getState().openFile(path)}
      className="underline decoration-dotted underline-offset-2 hover:opacity-80"
    >
      {children}
    </button>
  );
}

function Rows({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <div className="grid grid-cols-[max-content_1fr] gap-x-4">
      {rows.map(([a, b], i) => (
        <div key={i} className="contents">
          <span>{a}</span>
          <span>{b}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- paths ---------- */

export function resolvePath(cwd: string, arg = ""): string {
  const parts = arg.startsWith("~") || arg.startsWith("/") ? [] : cwd.split("/").filter(Boolean);
  for (const seg of arg.replace(/^~\/?|^\//, "").split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

function listDir(dir: string) {
  if (!dir) return tree;
  const folder = tree.find((n) => n.type === "folder" && n.path === dir);
  return folder?.type === "folder" ? folder.children : null;
}

/* ---------- commands ---------- */

// Plain ASCII so it lines up in any monospace font (FIGlet, from `npm run banners`).
const ART = monogramArt.join("\n");

export const commands: Record<string, Command> = {
  help: {
    description: "List available commands",
    run: () => (
      <div>
        <p>Available commands:</p>
        <Rows
          rows={Object.entries(commands)
            .filter(([, c]) => !c.hidden)
            .map(([name, c]) => [
              <span key={name} className={C.green}>{c.usage ?? name}</span>,
              <span key={`${name}-d`} className={C.dim}>{c.description}</span>,
            ])}
        />
        <p className={`mt-1 ${C.dim}`}>Tip: Tab completes, ↑/↓ browse history, Ctrl+L clears.</p>
      </div>
    ),
  },
  about: {
    description: "Who I am",
    run: () => (
      <div className="space-y-1">
        <p>
          <span className={`${C.green} font-bold`}>{profile.name}</span> — {profile.role} · {profile.location}
        </p>
        <p>{profile.summary}</p>
        <p className={C.dim}>
          → <FileButton path="about.tsx">open about.tsx</FileButton>
        </p>
      </div>
    ),
  },
  experience: {
    description: "Work history",
    run: () => (
      <div className="space-y-2">
        {experience.map((job) => (
          <div key={job.id}>
            <p>
              <span className={`${C.yellow} font-bold`}>{job.role}</span> @ <span className={C.cyan}>{job.company}</span>
            </p>
            <p className={C.dim}>
              {job.start} – {job.end} · {job.location}
            </p>
            <p>
              {job.bullets.length} highlights → <FileButton path="experience.log">open experience.log</FileButton>
            </p>
          </div>
        ))}
      </div>
    ),
  },
  projects: {
    description: "Side projects",
    run: () => (
      <div className="space-y-1.5">
        {projects.map((p) => {
          const file = tree
            .flatMap((n) => (n.type === "folder" ? n.children : []))
            .find((f) => f.path.includes(p.slug));
          return (
            <div key={p.slug}>
              <p>
                <span className={`${C.magenta} font-bold`}>{p.name}</span> <span className={C.dim}>({p.kind})</span>
                {p.url && (
                  <>
                    {" "}
                    <TermLink href={p.url}>{p.url.replace("https://", "")}</TermLink>
                  </>
                )}
              </p>
              <p>
                {p.summary}
                {file && (
                  <>
                    {" "}
                    <FileButton path={file.path}>[{basename(file.path)}]</FileButton>
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>
    ),
  },
  skills: {
    description: "Tech stack",
    run: () => (
      <Rows
        rows={skills.map((g) => [
          <span key={g.id} className={C.yellow}>{g.label}</span>,
          <span key={`${g.id}-i`}>{g.items.join(", ")}</span>,
        ])}
      />
    ),
  },
  education: {
    description: "Education",
    run: () => (
      <div>
        <p>
          <span className={`${C.yellow} font-bold`}>{education.degree}</span> @ {education.school}
        </p>
        <p className={C.dim}>
          {[`${education.start} – ${education.end}`, education.grade, education.honors].filter(Boolean).join(" · ")}
        </p>
      </div>
    ),
  },
  contact: {
    description: "How to reach me",
    run: () => (
      <Rows
        rows={[
          [<span key="e" className={C.yellow}>email</span>, <TermLink key="ev" href={`mailto:${profile.email}`}>{profile.email}</TermLink>],
          [<span key="l" className={C.yellow}>linkedin</span>, <TermLink key="lv" href={profile.links.linkedin} />],
          [<span key="g" className={C.yellow}>github</span>, <TermLink key="gv" href={profile.links.github} />],
          ...(profile.links.extra
            ? [[<span key="x" className={C.yellow}>{profile.links.extra.label.toLowerCase()}</span>, <TermLink key="xv" href={profile.links.extra.url} />] as [ReactNode, ReactNode]]
            : []),
          [<span key="r" className={C.yellow}>location</span>, profile.location],
        ]}
      />
    ),
  },
  github: {
    description: "Open my GitHub",
    hidden: true,
    run: () => {
      openExternal(profile.links.github);
      return <p>Opening {profile.links.github}…</p>;
    },
  },
  linkedin: {
    description: "Open my LinkedIn",
    hidden: true,
    run: () => {
      openExternal(profile.links.linkedin);
      return <p>Opening {profile.links.linkedin}…</p>;
    },
  },
  ...(profile.links.extra && {
    [profile.links.extra.label.toLowerCase().replace(/\W+/g, "-")]: {
      description: `Open my ${profile.links.extra.label}`,
      hidden: true,
      run: () => {
        openExternal(profile.links.extra!.url);
        return <p>Opening {profile.links.extra!.url}…</p>;
      },
    },
  }),
  ...(features.chat && {
    ask: {
      description: `Ask ${assistant.name}, ${profile.firstName}'s personal assistant`,
      usage: "ask <question>",
      run: ({ args }: CommandContext) => {
        if (!args.length) {
          return <p className={C.red}>usage: ask &lt;question&gt;, e.g. ask what is {profile.pronouns.possessive} tech stack?</p>;
        }
        useWorkbench.getState().openChat();
        void useChat.getState().send(args.join(" "));
        return <p className={C.dim}>Asked {assistant.name} — see the panel on the right →</p>;
      },
    },
  }),
  "hire-me": {
    description: "Start an email to me",
    run: () => {
      composeEmail();
      return <p className={C.green}>Excellent choice. Opening your mail client…</p>;
    },
  },
  neofetch: {
    description: "System info, portfolio edition",
    run: () => {
      const theme = getTheme(useWorkbench.getState().theme);
      const rows: [string, string][] = [
        ["OS", "PortfolioOS (Next.js)"],
        ["Host", profile.location],
        ["Uptime", `${profile.yearsOfExperience} years professional`],
        ...(experience[0] ? [["Role", `${experience[0].role} @ ${experience[0].company}`] as [string, string]] : []),
        ["Shell", "zsh-ish"],
        ["Theme", theme.label],
        ["Stack", profile.coreStack.join(", ")],
        ["Education", [education.degree, education.grade].filter(Boolean).join(" · ")],
      ];
      return (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <pre className={`${C.cyan} leading-tight`}>{ART}</pre>
          <div>
            <p>
              <span className={`${C.green} font-bold`}>{profile.handle}</span>@<span className={`${C.green} font-bold`}>portfolio</span>
            </p>
            <p className={C.dim}>{"-".repeat(profile.handle.length + 10)}</p>
            {rows.map(([k, v]) => (
              <p key={k}>
                <span className={`${C.yellow} font-bold`}>{k}</span>: {v}
              </p>
            ))}
            <div className="mt-1 flex">
              {["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"].map((c) => (
                <span key={c} className="inline-block h-3 w-5" style={{ background: `var(--ansi-${c})` }} />
              ))}
            </div>
          </div>
        </div>
      );
    },
  },
  ls: {
    description: "List files",
    usage: "ls [dir]",
    run: ({ args, cwd }) => {
      const dir = resolvePath(cwd, args[0]);
      const entries = listDir(dir);
      if (!entries) return <p className={C.red}>ls: {args[0]}: No such file or directory</p>;
      return (
        <div className="flex flex-wrap gap-x-5">
          {entries.map((e) =>
            e.type === "folder" ? (
              <span key={e.path} className={`${C.blue} font-bold`}>
                {e.name}/
              </span>
            ) : (
              <FileButton key={e.path} path={e.path}>
                {e.name}
              </FileButton>
            ),
          )}
        </div>
      );
    },
  },
  cd: {
    description: "Change directory",
    usage: "cd <dir>",
    run: ({ args, cwd, setCwd }) => {
      const target = resolvePath(cwd, args[0] ?? "~");
      if (target && !folderPaths.includes(target)) {
        return <p className={C.red}>cd: no such file or directory: {args[0]}</p>;
      }
      setCwd(target);
    },
  },
  pwd: {
    description: "Print working directory",
    run: ({ cwd }) => <p>~/portfolio{cwd ? `/${cwd}` : ""}</p>,
  },
  cat: {
    description: "Print a file",
    usage: "cat <file>",
    run: ({ args, cwd, files }) => {
      if (!args[0]) return <p className={C.red}>usage: cat &lt;file&gt;</p>;
      const path = resolvePath(cwd, args[0]);
      const file = files.find((f) => f.path === path);
      if (!file) {
        const isDir = folderPaths.includes(path);
        return <p className={C.red}>cat: {args[0]}: {isDir ? "Is a directory" : "No such file or directory"}</p>;
      }
      return <pre className="whitespace-pre-wrap">{file.source.replace(/\n$/, "")}</pre>;
    },
  },
  open: {
    description: "Open a file in the editor",
    usage: "open <file>",
    run: ({ args, cwd }) => {
      if (!args[0]) return <p className={C.red}>usage: open &lt;file&gt;</p>;
      const target = resolveWorkspaceHref(resolvePath(cwd, args[0]));
      if (target?.type !== "file") return <p className={C.red}>open: {args[0]}: No such file</p>;
      useWorkbench.getState().openFile(target.path);
    },
  },
  code: {
    description: "Alias for open",
    hidden: true,
    run: (ctx) => commands.open.run(ctx),
  },
  theme: {
    description: "List or switch color themes",
    usage: "theme [name]",
    run: ({ args }) => {
      const { theme: current, setTheme } = useWorkbench.getState();
      if (!args.length) {
        return (
          <div>
            {themes.map((t) => (
              <p key={t.id}>
                {t.id === current ? <span className={C.green}>* </span> : "  "}
                {t.id} <span className={C.dim}>({t.label})</span>
              </p>
            ))}
          </div>
        );
      }
      const wanted = args.join("-").toLowerCase().replace(/\+/g, "-plus");
      const match = themes.find((t) => t.id === wanted || t.label.toLowerCase() === args.join(" ").toLowerCase());
      if (!match) return <p className={C.red}>theme: unknown theme &apos;{args.join(" ")}&apos;. Run `theme` to list.</p>;
      setTheme(match.id);
      return <p>Switched to {match.label}.</p>;
    },
  },
  whoami: {
    description: "Print the current user",
    run: () => <p>{profile.handle} — {profile.role}</p>,
  },
  date: {
    description: "Print the date",
    hidden: true,
    run: () => <p>{new Date().toString()}</p>,
  },
  echo: {
    description: "Print text",
    hidden: true,
    run: ({ args }) => <p>{args.join(" ")}</p>,
  },
  history: {
    description: "Command history",
    hidden: true,
    run: ({ history }) => (
      <div>
        {history.map((h, i) => (
          <p key={i}>
            <span className={C.dim}>{String(i + 1).padStart(4)}</span> {h}
          </p>
        ))}
      </div>
    ),
  },
  sudo: {
    description: "",
    hidden: true,
    run: ({ args }) =>
      args[0] === "hire-me" ? (
        commands["hire-me"].run({} as CommandContext)
      ) : (
        <p>
          {profile.handle} is not in the sudoers file. This incident will be reported. <span className={C.dim}>(try `sudo hire-me`)</span>
        </p>
      ),
  },
  clear: {
    description: "Clear the terminal",
    run: ({ clear }) => clear(),
  },
  exit: {
    description: "Close the panel",
    run: () => useWorkbench.getState().closePanel(),
  },
};

export function completions(input: string, cwd: string): string[] {
  const parts = input.split(" ");
  if (parts.length === 1) {
    return Object.keys(commands).filter((c) => c.startsWith(parts[0]) && !commands[c].hidden);
  }
  const partial = parts[parts.length - 1];
  const slash = partial.lastIndexOf("/");
  const dirPart = slash === -1 ? "" : partial.slice(0, slash + 1);
  const entries = listDir(resolvePath(cwd, dirPart)) ?? [];
  return entries
    .map((e) => dirPart + e.name + (e.type === "folder" ? "/" : ""))
    .filter((name) => name.startsWith(partial))
    .map((name) => [...parts.slice(0, -1), name].join(" "));
}
