# Portfolio — VS Code edition

A developer portfolio styled as a VS Code workbench. Each resume section is a file in the explorer, highlighted the way VS Code would highlight it.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

Copy `.env.example` to `.env.local` and fill in what you use. Everything is optional: without a key the chat just says it isn't configured.

## Edit the content

All content comes from **`src/data/profile.ts`**: profile, experience, projects, skills, education, story, gear and links, plus the site settings at the top:

- `features` turns the optional parts on or off: `chat` (the AI assistant), `githubActivity` (the sidebar's contribution calendar), `portrait` (an ASCII portrait instead of the greeting) and `easterEggs` (runner game, high-five weather, shutdown).
- `assistant` names the chat assistant.

The virtual files (`README.md`, `about.tsx`, `experience.log`, `education.yml`, `contact.sh`, `GEAR.md`, the files in `projects/`) are generated from it in `src/data/files.ts`. So are the terminal commands, the Extensions (My skills) view, the Source Control career timeline and the chat assistant's knowledge.

After changing `firstName`, `monogram` or `assistant`, regenerate the lettering:

```bash
npm run banners   # the README greeting, the chat banner and the neofetch monogram
```

- Skill icons and one-line descriptions: `src/data/skill-icons.ts`. Skills not listed there still show, with a generic icon.
- Logo: `profile.monogram` (two letters) is drawn in the pixel alphabet in `src/data/monogram.ts`: the favicon, app icon, contact card and runner game.
- ASCII portrait (optional): put a headshot at `assets/portrait.png`, run `npm run ascii` (needs [ascii-image-converter](https://github.com/TheZoraiz/ascii-image-converter) on your `PATH`), then set `features.portrait`. `npm run gaze` makes it follow the cursor (needs `REPLICATE_API_TOKEN`, about $0.12).
- Themes: `src/data/themes.ts` (Shiki theme ids) and the matching `[data-theme]` color blocks in `src/app/globals.css`.

## Features

- **Explorer, tabs, breadcrumbs.** Opening a file updates the URL hash, so `/#about.tsx` links straight to that file.
- **Real syntax highlighting.** Shiki renders every file for 5 themes at build time: Dark+, Light+, Dracula, GitHub Dark and One Dark Pro.
- **Command palette** (`⌘P` / `⇧⌘P`), with a color-theme picker that previews themes live.
- **Integrated terminal** (`` ⌃` `` or `⌘J`): `help`, `neofetch`, `projects`, `contact`, `cat`, `ls`, `cd`, `open`, `theme` and more. Tab completes and ↑/↓ browse history.
- **Search** across all files, with match-case and whole-word toggles.
- **Source Control**: a "commit" box that opens an email draft, plus a career git graph.
- **Extensions** shows skills as installed extensions.
- **Phones:** the explorer becomes a slide-over drawer.
- **Chat assistant** (`features.chat`): a Claude Code–style chat docked on the right (`⌥⌘B`) that answers visitors' questions from `profile.ts`. It runs on `claude-haiku-4-5` (`src/lib/chat-config.ts`), capped at 20 questions per visitor per 10 minutes per server instance, so set a monthly spend limit on your Anthropic workspace as the real backstop.
- **GitHub activity** (`features.githubActivity`): the contribution calendar and recently pushed repos of `profile.githubUser`, cached and refreshed at most hourly.
- **Easter eggs** (`features.easterEggs`): an endless runner starring the pixel logo, and five high fives with the greeting's waving hand make it rain…

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui (Radix), cmdk, Shiki, Zustand, Motion, react-icons, react-markdown, sonner.
