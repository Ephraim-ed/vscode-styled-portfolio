import {
  assistant,
  education,
  experience,
  features,
  gear,
  profile,
  projects,
  story,
  type Project,
} from "./profile";
import { greeting } from "./greeting";
import { MONOGRAM_ROWS } from "./monogram";
import { portrait } from "./portrait";
import { siteStack } from "./site-stack";

export type VirtualFileSource = {
  /** Path relative to the workspace root, e.g. "projects/pantry.py". */
  path: string;
  /** Shiki language id. */
  lang: string;
  /** Language mode label shown in the status bar. */
  language: string;
  /** Tab size used for indent guides. */
  tabSize: number;
  source: string;
};

export type FolderNode = {
  type: "folder";
  name: string;
  path: string;
  children: TreeNode[];
};
export type FileNode = { type: "file"; name: string; path: string };
export type TreeNode = FolderNode | FileNode;

export const WORKSPACE = "portfolio";

const q = (s: string) => JSON.stringify(s);
const camel = (slug: string) =>
  slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/* ------------------------------------------------------------------ */
/* Root files                                                          */
/* ------------------------------------------------------------------ */

/**
 * A mountain range between the hero and Quick links (```mountains fence; plain ASCII): near peaks
 * with shaded (`:`) faces, a dotted far range behind them, a sun, birds and a tree line.
 */
const mountains = [
  "                                          v                             .--.",
  "           v                                                           (    )",
  "               v                                                        `--'",
  "                                                   .'",
  "                            .'                    .  '",
  "                           .  '    /\\            .    '          .'",
  "               .'         .    '  /  \\          .      ' /\\     .  '",
  "              .  '       .       /   .\\                 /  \\   .    '          .'",
  "             .    '     .       /     :\\      /\\       /   .\\ .      '        .  '",
  "         /\\ .      '   .       /      ::\\    /  \\     /     :\\        '      .    '",
  "        /  \\         /\\       /       :::\\  /   .\\   /      ::\\         /\\  .      '",
  "       /   .\\       /  \\     /         :::\\/     :\\_/       :::\\       /  \\",
  "      /     :\\     /   .\\   /                                :::\\     /   .\\",
  "     /      ::\\   /     :\\_/                                 ::::\\   /     :\\",
  "____/       :::\\_/                                           :::::\\_/      ::\\______",
  "  ^   ^^  ^     ^ ^^^    ^      ^^   ^  ^^^     ^   ^^ ^      ^^^   ^    ^^  ^",
];

/** The raw README's stand-in for the runner game (the preview plays it): the pixel monogram, in the
 * same █ and ░ blocks as the greeting, about to jump a cactus. */
const dinoScene = (() => {
  const on = (r: number, c: number) => MONOGRAM_ROWS[r]?.[c] === "#";
  const logo = Array.from({ length: MONOGRAM_ROWS.length + 1 }, (_, r) =>
    Array.from({ length: MONOGRAM_ROWS[0].length + 1 }, (_, i) => (on(r, i - 1) ? "██" : on(r - 1, i) ? "░░" : "  ")).join(""),
  );
  const cactus = ["    ██", "    ██  ██", "██  ██  ██", "██  ██████", "██████", "    ██"];
  const gap = 8;
  const lines = logo.map((l, i) => `${l}${" ".repeat(gap)}${cactus[i] ?? ""}`.replace(/\s+$/, ""));
  const width = Math.max(...lines.map((l) => l.length));
  return [...lines, "=".repeat(width), "", `${" ".repeat(Math.max(0, Math.floor((width - 25) / 2)))}Open the preview to play.`];
})();

/** Heading of the README's call-to-action section (the preview gives it a highlighted panel). */
export const WORK_WITH_ME = "I'd love to work with you";

/** Where I've worked from, in words: "hybrid in Austin, TX and remotely for a team in Denver, CO". */
function workedFrom() {
  const places = [...new Set(experience.map((job) => job.location))].map((location) => {
    const [mode, place] = location.includes(" · ") ? location.split(" · ") : ["", location];
    if (!mode) return `in ${place}`;
    return mode === "Remote" ? `remotely for a team in ${place}` : `${mode.toLowerCase()} in ${place}`;
  });
  return places.length > 1 ? `${places.slice(0, -1).join(", ")} and ${places.at(-1)}` : places[0];
}

/** The pitch above the contact cards: availability, what I build, and how I've worked. */
const workWithMe = [
  profile.openToWork ? "I'm open to new roles and projects." : "I'm always happy to talk shop.",
  profile.pitch,
  `I've worked ${workedFrom()}.`,
].join(" ");

/** README's "My story": numbered steps (title, text, `tags`), which the preview draws as a timeline. */
export const MY_STORY = "My story";
/** Names in the story that link to their files: projects to their file, companies to experience.log. */
const storyLinks = (): Record<string, string> => ({
  ...Object.fromEntries(experience.map((job) => [job.company.replace(/\.$/, ""), "./experience.log"])),
  ...Object.fromEntries(projectFiles.map((f, i) => [projects[i].name, `./${f.path}`])),
});
/** Links the first mention of each name, as a whole word. */
const linkStory = (text: string) =>
  Object.entries(storyLinks()).reduce((t, [name, href]) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return t.replace(new RegExp(`(?<!\\w)${escaped}(?!\\w)`), `[${name}](${href})`);
  }, text);
const storyMd = () =>
  story
    .map((s, i) =>
      [
        `${i + 1}. **${s.title}**\\`,
        `   ${linkStory(s.text)}\\`,
        `   ${s.tags.map((t) => `\`${t}\``).join(" ")}`,
      ].join("\n"),
    )
    .join("\n");

/** Markdown sections, dropping the empty ones (a section is an array of lines, or null). */
const sections = (...parts: (string | null | false)[]) => parts.filter((p) => p !== null && p !== false).join("\n\n");

const andList = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? "");

const contactNames = ["Email", "LinkedIn", "GitHub", ...(profile.links.extra ? [profile.links.extra.label] : [])];

/** Built lazily: it links to the project files, which are defined further down. */
const readme = () =>
  `${sections(
    `\`\`\`ascii
${(features.portrait && portrait.length ? portrait : greeting).join("\n")}
\`\`\``,
    profile.tagline,
    `> ${profile.yearsOfExperience} years · ${profile.coreStack.join(" · ")}
>
> Based in ${profile.location}${profile.openToWork ? " · Open to work" : ""}`,
    `\`\`\`mountains
${mountains.join("\n")}
\`\`\``,
    `## Quick links

${[
  "- [About me](./about.tsx) — Summary, focus areas, and this site's tech stack",
  "- [Experience](./experience.log) — Roles and what I worked on",
  `- [Projects](./projects) — ${projects.length} side project${projects.length === 1 ? "" : "s"}: ${andList(projects.map((p) => p.name))}`,
  "- [Skills](command:workbench.view.extensions) — Languages, frameworks, cloud and testing",
  `- [Education](./education.yml) — ${[education.degree, education.honors].filter(Boolean).join(", ")}`,
  `- [Contact](./contact.sh) — ${andList(contactNames)}`,
  gear.length ? "- [My gear](./GEAR.md) — The setup behind the code" : null,
]
  .filter(Boolean)
  .join("\n")}`,
    story.length > 0 && `## ${MY_STORY}\n\n${storyMd()}`,
    `## ${WORK_WITH_ME}

${workWithMe}

${[
  `- [Email me](mailto:${profile.email}) — The quickest way to reach me`,
  `- [LinkedIn](${profile.links.linkedin}) — Connect, or send me a message`,
  `- [GitHub](${profile.links.github}) — Code and side projects`,
  profile.links.extra ? `- [${profile.links.extra.label}](${profile.links.extra.url}) — ${profile.links.extra.blurb}` : null,
  features.chat
    ? `- [Ask ${assistant.name}](command:chat.open) — Questions first? My assistant answers from my resume`
    : null,
]
  .filter(Boolean)
  .join("\n")}`,
    `## Getting around

${markdownTable(
  ["Shortcut", "Action"],
  [
    ["`⌘P` / `Ctrl+P`", "Go to file"],
    ["`⇧⌘P` / `Ctrl+Shift+P`", "Command palette"],
    ["`⌘J` / `Ctrl+J`", "Toggle terminal"],
    ["`⌘B` / `Ctrl+B`", "Toggle sidebar"],
    ...(features.chat ? [["`⌥⌘B` / `Ctrl+Alt+B`", `Chat with ${assistant.name}, my personal assistant`]] : []),
  ],
)}`,
    "---",
    `Made with ❤️, ☕, and ✻ by ${profile.firstName}`,
    features.easterEggs &&
      `\`\`\`dino
${dinoScene.join("\n")}
\`\`\``,
  )}
`;

const gearMd = `# My gear

The setup behind the code.

${markdownTable(
  ["Gear", "Model"],
  gear.map((g) => [g.kind, `**${g.name}**`]),
)}

Back to [README.md](./README.md).
`;

function markdownTable(head: string[], rows: string[][]) {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const row = (cells: string[]) => `| ${cells.map((c, i) => c.padEnd(widths[i])).join(" | ")} |`;
  return [row(head), row(widths.map((w) => "-".repeat(w))), ...rows.map(row)].join("\n");
}

const about = `import { Engineer, Focus } from "@/people";

/**
 * ${profile.name} — ${profile.role}
 * ${profile.location}
 */
export default function About() {
  return (
    <Engineer
      name=${q(profile.name)}
      role=${q(profile.role)}
      experience=${q(`${profile.yearsOfExperience} years`)}
      location=${q(profile.location)}
      openToWork={${profile.openToWork}}
      stack={[${profile.coreStack.map(q).join(", ")}]}
    >
      <p>
        ${profile.summary}
      </p>

      <Focus>
${profile.focus.map((f) => `        <li>${f}</li>`).join("\n")}
      </Focus>

      <p>
        ${experience[0]?.current ? `Currently ${/^[aeiou]/i.test(experience[0].role) ? "an" : "a"} ${experience[0].role} at ${experience[0].company.replace(/\.$/, "")}. ` : ""}Outside of
        work I ship side projects: ${andList(projects.map((p) => p.name))}.
        See <a href="./projects">./projects</a>.
      </p>
    </Engineer>
  );
}

/** This portfolio — a VS Code look-alike — is built with: */
export const builtWith = {
${siteStack.map((g) => `  ${g.label}: [${g.items.map(q).join(", ")}],`).join("\n")}
};
`;

const experienceLog = `# experience.log — career history, newest first
# Tip: run \`experience\` in the terminal for a summary.

${experience
  .map((job) => {
    const period = `${job.startISO} … ${job.current ? "present" : toISOMonth(job.end)}`;
    const header = `${period.padEnd(19)} INFO  ${job.role} @ ${q(job.company)}  (${job.location})`;
    const bullets = job.bullets.map((b) => `  - ${b}`);
    return [header, ...bullets].join("\n");
  })
  .join("\n\n")}

${`${education.start} … ${education.end}`.padEnd(19)} INFO  ${education.degree} @ ${q(education.school)}
  - ${[education.grade, education.honors].filter(Boolean).join(" · ") || "Graduated"} — see ./education.yml
`;

function toISOMonth(label: string) {
  const months = [
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December",
  ];
  const [month, year] = label.split(" ");
  const index = months.indexOf(month);
  return index === -1 ? label : `${year}-${String(index + 1).padStart(2, "0")}`;
}

const educationYml = `# education.yml

university: ${education.school}
degree: ${education.degree}
period: ${education.start} – ${education.end}${education.grade ? `\ngrade: ${education.grade}` : ""}${
  education.honors ? `\nhonors:\n  - ${education.honors}` : ""
}${education.coursework.length ? `\n\ncoursework:\n${education.coursework.map((c) => `  - ${c}`).join("\n")}` : ""}
`;

const contactSh = `#!/usr/bin/env bash
# contact.sh — let's build something together.
# Click any link below, or run \`contact\` in the terminal.

NAME=${q(profile.name)}
ROLE=${q(profile.role)}
LOCATION=${q(profile.location)}

EMAIL=${q(profile.email)}
LINKEDIN=${q(profile.links.linkedin)}
GITHUB=${q(profile.links.github)}${
  profile.links.extra ? `\n${profile.links.extra.label.toUpperCase().replace(/\W+/g, "_")}=${q(profile.links.extra.url)}` : ""
}

STATUS=${q(profile.openToWork ? "open-to-work" : "employed")}

say_hello() {
  echo "Opening a new email to $NAME..."
  open "mailto:$EMAIL"
}

say_hello
`;

/* ------------------------------------------------------------------ */
/* Projects — each in a different language, generated from profile.ts  */
/* ------------------------------------------------------------------ */

function projectTs(p: Project) {
  return `import type { Project } from "./types";

/** ${p.name} — ${p.kind} */
export const ${camel(p.slug)}: Project = {
  name: ${q(p.name)},
  kind: ${q(p.kind)},${p.url ? `\n  live: ${q(p.url)},` : ""}
  summary: ${q(p.summary)},
  features: [
${p.features.map((f) => `    ${q(f)},`).join("\n")}
  ],
  tags: [${p.tags.map(q).join(", ")}],
};
`;
}

function projectJs(p: Project) {
  return `// ${p.name} — ${p.kind}

/** @type {import("./types").Project} */
export const ${camel(p.slug)} = {
  name: ${q(p.name)},
  kind: ${q(p.kind)},${p.url ? `\n  live: ${q(p.url)},` : ""}
  summary: ${q(p.summary)},
  features: [
${p.features.map((f) => `    ${q(f)},`).join("\n")}
  ],
  tags: [${p.tags.map(q).join(", ")}],
};
`;
}

function projectPy(p: Project) {
  return `"""${p.name} — ${p.kind}."""

from dataclasses import dataclass, field


@dataclass
class Project:
    name: str
    kind: str
    summary: str
    features: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)


${p.slug.replace(/-/g, "_")} = Project(
    name=${q(p.name)},
    kind=${q(p.kind)},
    summary=${q(p.summary)},
    features=[
${p.features.map((f) => `        ${q(f)},`).join("\n")}
    ],
    tags=[${p.tags.map(q).join(", ")}],
)
`;
}

function projectYml(p: Project) {
  return `# ${p.name} — ${p.kind}

name: ${q(p.name)}
kind: ${p.kind}${p.url ? `\nlive: ${p.url}` : ""}
summary: >
  ${p.summary}
features:
${p.features.map((f) => `  - ${f}`).join("\n")}
tags: [${p.tags.join(", ")}]
`;
}

function projectJson(p: Project) {
  return `${JSON.stringify(
    {
      name: p.name,
      kind: p.kind,
      ...(p.url ? { live: p.url } : {}),
      summary: p.summary,
      features: p.features,
      tags: p.tags,
    },
    null,
    2,
  )}
`;
}

const projectFormats: Record<
  Project["file"],
  { lang: string; language: string; tabSize: number; render: (p: Project) => string }
> = {
  json: { lang: "json", language: "JSON", tabSize: 2, render: projectJson },
  ts: { lang: "ts", language: "TypeScript", tabSize: 2, render: projectTs },
  py: { lang: "python", language: "Python", tabSize: 4, render: projectPy },
  yml: { lang: "yaml", language: "YAML", tabSize: 2, render: projectYml },
  js: { lang: "js", language: "JavaScript", tabSize: 2, render: projectJs },
};

const projectFiles: VirtualFileSource[] = projects.map((p) => {
  const f = projectFormats[p.file] ?? projectFormats.ts;
  return {
    path: `projects/${p.slug}.${p.file in projectFormats ? p.file : "ts"}`,
    lang: f.lang,
    language: f.language,
    tabSize: f.tabSize,
    source: f.render(p),
  };
});

/* ------------------------------------------------------------------ */
/* Workspace                                                           */
/* ------------------------------------------------------------------ */

export const HOME_PATH = "README.md";
export const CONTACT_PATH = "contact.sh";

export const fileSources: VirtualFileSource[] = [
  ...projectFiles,
  { path: "README.md", lang: "markdown", language: "Markdown", tabSize: 2, source: readme() },
  ...(gear.length ? [{ path: "GEAR.md", lang: "markdown", language: "Markdown", tabSize: 2, source: gearMd }] : []),
  { path: "about.tsx", lang: "tsx", language: "TypeScript JSX", tabSize: 2, source: about },
  { path: "experience.log", lang: "log", language: "Log", tabSize: 2, source: experienceLog },
  { path: "education.yml", lang: "yaml", language: "YAML", tabSize: 2, source: educationYml },
  { path: "contact.sh", lang: "shellscript", language: "Shell Script", tabSize: 2, source: contactSh },
];

/** Explorer tree, in curated reading order (folders first, like VS Code). */
export const tree: TreeNode[] = [
  {
    type: "folder",
    name: "projects",
    path: "projects",
    children: projectFiles.map((f) => ({
      type: "file",
      name: basename(f.path),
      path: f.path,
    })),
  },
  ...["README.md", "GEAR.md", "about.tsx", "experience.log", "education.yml", "contact.sh"]
    .filter((path) => fileSources.some((f) => f.path === path))
    .map((path): FileNode => ({ type: "file", name: path, path })),
];

export const folderPaths = tree.filter((n) => n.type === "folder").map((n) => n.path);

/** 1-based line numbers inside the ```ascii fence (the README art), which render as art, not text. */
export function asciiArtLines(source: string): Set<number> {
  const lines = new Set<number>();
  let inside = false;
  source.split("\n").forEach((line, i) => {
    if (!inside && /^```ascii\s*$/.test(line)) inside = true;
    else if (inside && /^```\s*$/.test(line)) inside = false;
    else if (inside) lines.add(i + 1);
  });
  return lines;
}

export function basename(path: string) {
  return path.slice(path.lastIndexOf("/") + 1);
}

export function dirname(path: string) {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

/** Where a link in the content leads: a file, a folder, or a sidebar view. */
export type WorkspaceTarget =
  | { type: "file" | "folder"; path: string }
  | { type: "view"; view: "explorer" | "search" | "scm" | "extensions"; label: string }
  | { type: "chat"; label: string };

/** VS Code command links (the same `command:` URIs VS Code's own markdown uses) that open a view. */
const COMMANDS: Record<string, Extract<WorkspaceTarget, { type: "view" | "chat" }>> = {
  "command:workbench.view.extensions": { type: "view", view: "extensions", label: "Extensions (My skills)" },
  ...(features.chat ? { "command:chat.open": { type: "chat", label: `${assistant.name} ${assistant.title}` } as const } : {}),
};

/** Resolve a link found in content ("./about.tsx", "./projects", a view command) to a workspace target. */
export function resolveWorkspaceHref(href: string): WorkspaceTarget | null {
  if (COMMANDS[href]) return COMMANDS[href];
  const path = href.replace(/^\.\//, "").replace(/\/$/, "");
  if (fileSources.some((f) => f.path === path)) return { type: "file", path };
  if (folderPaths.includes(path)) return { type: "folder", path };
  return null;
}
