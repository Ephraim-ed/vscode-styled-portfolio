# How the starter fits together

Read this before changing anything beyond `src/data/profile.ts`: adding a virtual file, a terminal
command, a theme, or reworking a section of the README preview.

## Contents

- [The data flow](#the-data-flow)
- [Where things live](#where-things-live)
- [The README preview's special sections](#the-readme-previews-special-sections)
- [Recipes](#recipes): add a virtual file, a terminal command, a palette command, a theme, a skill icon, a file icon, a project file language
- [Feature flags](#feature-flags)
- [Gotchas](#gotchas)

## The data flow

```
src/data/profile.ts            ← the only file most portfolios need to edit
   │
   ├─► src/data/files.ts        builds every virtual file's source text (README.md, about.tsx,
   │                            experience.log, education.yml, contact.sh, GEAR.md, projects/*)
   │                            plus the explorer tree and link resolution
   │      │
   │      └─► src/lib/highlight.ts   Shiki highlights each file for all 5 themes at BUILD time,
   │                                 collapses token styles into classes + one stylesheet
   │             │
   │             └─► src/app/page.tsx   server component: passes the highlighted files to <Workbench>
   │
   ├─► src/components/workbench/*     the VS Code shell (client components, state in src/lib/store.ts)
   ├─► src/lib/chat-knowledge.ts      the chat assistant's system prompt
   └─► scripts/ascii-banners.mjs      FIGlet lettering → src/data/greeting.ts, assistant-banner.ts,
                                      monogram-art.ts (run `npm run banners` after name changes)
```

Everything is static except `/api/chat` (streams Claude answers) and `/api/github` (cached hourly).

## Where things live

| Thing | File |
| --- | --- |
| Content + feature flags + assistant name | `src/data/profile.ts` |
| Virtual files, explorer tree, `command:` links | `src/data/files.ts` |
| Syntax highlighting, link detection in code | `src/lib/highlight.ts` |
| Workbench state (tabs, sidebar, panel, chat, theme, palette) | `src/lib/store.ts` (Zustand) |
| Layout shell, global shortcuts, URL hash sync, welcome toast | `src/components/workbench/workbench.tsx` |
| Title bar, activity bar, status bar | `src/components/workbench/{title-bar,activity-bar,status-bar}.tsx` |
| Sidebar views | `src/components/workbench/sidebar/{explorer,search,scm,extensions}-view.tsx`, `github-activity.tsx` |
| Editor (tabs, breadcrumbs, code view, minimap) | `src/components/workbench/editor/{editor-group,code-view}.tsx` |
| Markdown preview (README, GEAR) | `src/components/workbench/editor/markdown-preview.tsx` + `link-cards.tsx`, `story-timeline.tsx`, `greeting.tsx` |
| Terminal + its commands | `src/components/workbench/panel/{terminal,commands}.tsx` |
| Command palette | `src/components/workbench/command-palette.tsx` |
| Chat panel / store / API / prompt | `chat/chat-panel.tsx`, `src/lib/chat-store.ts`, `src/app/api/chat/route.ts`, `src/lib/chat-knowledge.ts` |
| Keyboard shortcut labels | `src/lib/platform.ts` |
| Theme list / theme colors | `src/data/themes.ts` / `[data-theme="…"]` blocks at the top of `src/app/globals.css` |
| Skill icons + one-liners | `src/data/skill-icons.ts` |
| Pixel monogram (logo, favicon, runner) | `src/data/monogram.ts`, `src/components/pixel-logo.tsx`, `src/lib/monogram-icon.tsx`, `src/app/{icon,apple-icon}.tsx` |
| Link → brand icon (GitHub, LinkedIn, Behance, Dribbble…) | `src/lib/link-icons.ts` |
| Easter eggs | `src/lib/weather.ts`, `editor/{high-five,weather,dino-runner}.tsx`, `src/lib/dino/*`, `shutdown.tsx`, `src/lib/sounds.ts` |
| SEO | `src/app/layout.tsx` (metadata), `page.tsx` (JSON-LD), `opengraph-image.tsx`, `robots.ts`, `sitemap.ts`, `src/lib/site.ts` |

## The README preview's special sections

`markdown-preview.tsx` recognises parts of the generated README and renders them specially. Keep
these shapes when editing the `readme()` template in `files.ts`, or the special rendering silently
falls back to plain markdown:

- The first ` ```ascii ` fence, plus the paragraph and blockquote after it, becomes the hero. The fence
  holds `greeting` (or `portrait` when `features.portrait`); the greeting gets the animated intro and
  the waving hand.
- ` ```mountains ` fence: the scenery band (sun by day, moon by night).
- A list where every item starts with a link (`- [Title](href) — description`) becomes link cards.
  Hrefs can be `./file`, `./folder`, `command:workbench.view.extensions`, `command:chat.open`,
  `mailto:` or `https://`.
- The list under `## I'd love to work with you` (`WORK_WITH_ME`) becomes the stacked contact cards.
- The ordered list under `## My story` (`MY_STORY`) becomes the timeline; each item is
  `N. **Title**\` / `   text\` / `` `tag` `tag` ``.
- The `Made with ❤️, ☕, and ✻ by …` line becomes the sign-off with icons (✻ is Claude's logo).
- ` ```dino ` fence: the runner game (its text is what the raw file view shows).

## Recipes

### Add a virtual file

1. Build its source string in `src/data/files.ts` (a template literal from profile data).
2. Add it to `fileSources` with a Shiki `lang` id, a status-bar `language` label and a `tabSize`.
3. Add its path to the root list in `tree` (order there is the explorer order).
4. If its extension is new, add an icon in `src/components/workbench/file-icon.tsx` (`byExtension`).
5. Link it from the README's Quick links and from `fileLinks` in `src/lib/chat-knowledge.ts` if visitors should find it.

Shiki loads only the languages that appear in `fileSources`, so a new `lang` costs nothing elsewhere.

### Add a terminal command

Add an entry to `commands` in `src/components/workbench/panel/commands.tsx`:
`{ description, usage?, hidden?, run: (ctx) => ReactNode | void }`. `ctx` has `args`, `cwd`,
`setCwd`, `files`, `history`, `clear`. Use the `C` color classes (ANSI theme colors) and
`TermLink` / `FileButton` for links. `hidden: true` keeps it out of `help` and tab completion.
Spread a conditional object (`...(features.x && { name: {…} })`) for feature-gated commands.

### Add a command-palette entry

Add to `getPaletteCommands()` in `command-palette.tsx`: `{ label: "Category: Action", run, keybinding? }`.

### Add a theme

1. Add `{ id, label, type: "dark" | "light", shiki: "<shiki theme id>" }` to `src/data/themes.ts`.
2. Copy a `[data-theme="…"]` block at the top of `src/app/globals.css` and set every token for it
   (take the colors from the VS Code theme's `colors` JSON: titleBar, activityBar, sideBar, editor,
   tab, statusBar, terminal ANSI colors…). Every token must be defined, or parts of the UI go blank.
3. Highlighting picks it up automatically at the next build.

To change the default theme, set `DEFAULT_THEME` in `themes.ts` and `viewport.themeColor` in
`src/app/layout.tsx` to that theme's `--titlebar`.

### Give a skill an icon

Add `Name: { icon, color?, description }` to `skillMeta` in `src/data/skill-icons.ts`, keyed by the
exact name used in `profile.ts`'s `skills`. Icons come from `react-icons` (`si` for brands, `tb`,
`vsc`). Check an icon exists before importing it:
`grep -q "export declare const SiFoo:" node_modules/react-icons/si/index.d.ts`.

### Give a project file another language

`Project.file` picks one of the renderers in `files.ts` (`ts`, `js`, `py`, `yml`, `json`). To add
one (say Go), write a `projectGo(p)` renderer, add it to `projectFormats` with its Shiki `lang`,
widen the `file` union in `profile.ts`, and add an icon for the extension in `file-icon.tsx`.

## Feature flags

`features` in `profile.ts` is read at build time; every place a feature shows up checks it:

| Flag | Gates |
| --- | --- |
| `chat` | chat panel, its status-bar item and title-bar toggle, `⌥⌘B`, palette entries, the terminal `ask` command, README's "Ask …" card and shortcut row, `/api/chat` (404 when off), the boot log line |
| `githubActivity` | the sidebar's GitHub pane, `/api/github` (404 when off), the site-stack line |
| `portrait` | which art the README hero shows (`portrait` must be non-empty, from `npm run ascii`) |
| `easterEggs` | the runner game fence, high-five hand (otherwise it only waves), weather layer, shutdown screen, the chat's secret bubble and whispers |

When adding a feature-specific UI anywhere, gate it the same way rather than deleting code, so
turning a feature back on is a one-word change.

## Gotchas

- **Next.js 16.** The starter's `AGENTS.md` note applies: APIs and conventions differ from older
  versions. Read the guide in `node_modules/next/dist/docs/` before writing framework-level code
  (routes, metadata, caching, config).
- **Turbopack refuses a symlinked `node_modules` that points outside the project.** Install
  dependencies in the project itself (`npm install`, or on macOS `cp -Rc` to clone another copy).
- **`npm run banners` imports `profile.ts` directly**, which needs Node 22.18+ or 23.6+ (native
  TypeScript type stripping). On older Node, run it with `node --experimental-strip-types`.
- **Generated files** (`greeting.ts`, `assistant-banner.ts`, `monogram-art.ts`, `portrait.ts`,
  `portrait-rig.ts`) say "do not edit by hand": regenerate them instead.
- **The monogram** uses only `a`–`z`; other characters are skipped. Two letters look best.
- **Experience `location`** is `"Mode · Place"` (with the middle dot) and **dates** are
  `"Month YYYY"` spelled out; `experience.log` and the README's "I've worked…" sentence parse them.
- **`files.ts` evaluates at module load**, top to bottom. Anything the README needs from further down
  (like `projectFiles`) has to be read lazily, which is why `readme` is a function.
