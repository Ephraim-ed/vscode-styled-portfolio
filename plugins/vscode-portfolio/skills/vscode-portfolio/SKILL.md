---
name: vscode-portfolio
description: Builds a developer portfolio website styled as a VS Code workbench (Next.js 16, React 19, Tailwind 4, Shiki), where each resume section is a file in the explorer — README.md, about.tsx, experience.log, projects/*, contact.sh — with tabs, a working terminal, command palette, five editor themes, skills as "extensions", an optional Claude chat assistant, GitHub activity sidebar, ASCII portrait and easter eggs. Use this skill whenever someone wants a VS Code–style, IDE-style, code-editor or terminal-themed portfolio or personal site, wants to turn a resume, CV or LinkedIn profile into a developer portfolio that looks like an editor, or asks to make "a portfolio like this one" for themselves or someone else — even if they don't say "VS Code" but describe files in a sidebar, tabs, a terminal or syntax-highlighted resume sections.
---

# VS Code–themed portfolio

This skill builds a portfolio that looks and behaves like VS Code. Visitors open `README.md`,
`about.tsx`, `experience.log` and the `projects/` files from the explorer. They can run `neofetch`
in the terminal, switch themes from the command palette, and browse skills as installed
extensions. The site is a working Next.js app, not a mockup.

It starts from a complete, tested starter in `assets/starter/`. Nearly all of it is driven by one
file, `src/data/profile.ts`, which holds the content plus `features` flags for the optional extras.
Your job is mostly to get the person's real content into that file, well written and no more public
than they want, and then to verify the build. Rewriting the shell is rarely needed.

## Workflow

### 1. Gather the content

Ask for a resume, CV, LinkedIn export or similar if they haven't shared one. Then fill the gaps in a
single round of questions, not a drip of them. You need:

- Name, the first name or nickname the greeting should use, pronouns (default they/them), two-letter
  monogram, role, location, email, GitHub and LinkedIn, plus one optional extra link.
- Experience, projects, education, skills. Story and gear are optional.
- **Which extras they want:**
  - The chat assistant needs an Anthropic API key and a name for the assistant.
  - GitHub activity is only worth it with a public, active account.
  - The ASCII portrait needs a photo and the `ascii-image-converter` CLI.
  - Easter eggs are the runner game, high-five weather and shutdown.
- **How much to share about their current or recent employer.** The site is public and the chat
  assistant repeats anything in it. Default to short, outcome-level descriptions, with no client
  names, internal tool names or unapproved metrics, unless they say otherwise.
  `references/content-guide.md` covers this.

Where they want the project to live is also their call. Ask if it isn't obvious from context.

### 2. Scaffold

```bash
<skill-dir>/scripts/new-portfolio.sh <target-dir>
cd <target-dir> && npm install
```

The script copies the starter and refuses a non-empty target. If they already have a project they
want this added to, scaffold next to it and say so. Don't overwrite their files.

### 3. Fill in `src/data/profile.ts`

Read `references/content-guide.md` first. It covers every field, the formats the code parses (such
as `"Hybrid · Austin, TX"` and `"March 2022"`), how to write for the site, and the privacy defaults.
Replace all of the sample person (Alex Rivera) and set `features` and `assistant`.

Then:

- Add any of their skills that `src/data/skill-icons.ts` doesn't cover. Unlisted skills still
  render, but with a generic icon.
- Run `npm run banners` to regenerate the greeting, the assistant banner and the neofetch monogram
  from the new names.
- For a portrait, save their photo as `assets/portrait.png`, run `npm run ascii`, then set
  `features.portrait: true`. If the converter isn't installed, leave the portrait off and say why.

### 4. Go beyond the config only when asked

New files, terminal commands, themes, sections or features are all possible. Read
`references/architecture.md` first. It maps the codebase, the README preview's special sections and
the recipes for common extensions. Gate new optional UI behind a `features` flag the way the starter
does. Before touching routes, metadata or config, read the Next.js 16 guide in
`node_modules/next/dist/docs/`, because this version differs from older Next.js.

### 5. Verify

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Then run `npm run dev` and look at it: the README preview, a project file, the terminal (`help`,
`neofetch`) and a light theme. If a browser tool is available, screenshot it. Also search the
project for leftover sample data: "Alex", "Rivera", "Northwind", "Brightpath", "Trailmix",
"example.com".

### 6. Hand over

Tell them how to run it and what each environment variable does (see `.env.example`):
`ANTHROPIC_API_KEY` for chat, an optional `GITHUB_TOKEN`, and `NEXT_PUBLIC_SITE_URL` in
production. It deploys to Vercel as is. If the chat is on, tell them to set a monthly spend limit on
their Anthropic workspace, since the built-in rate limit is per server instance. Point them to
`src/data/profile.ts` as the one file to edit later, and to `npm run banners` after any name change.

## Why things are the way they are

- **One data file.** The README, the about file, the terminal, the Extensions view, the git graph and
  the chat prompt are all generated from `profile.ts`, so they can't drift apart. Put content there
  rather than hard-coding it into components.
- **Highlighting at build time.** Shiki renders every file for every theme on the server, which keeps
  the page fast and the highlighting accurate. Virtual files are plain strings in real languages, so
  keep them valid TypeScript, YAML, JSON and so on, and they'll highlight properly.
- **Feature flags rather than deletions.** Turning a flag off hides every trace of that feature,
  including its API route, which returns 404. Turning it back on is a one-word change.
