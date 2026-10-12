# Filling in profile.ts

How to turn a resume, a LinkedIn profile or a conversation into `src/data/profile.ts`, and how to
write for it. The sample person in the starter (Alex Rivera) shows the shape of every field.

## Contents

- [Field by field](#field-by-field)
- [Writing for the site](#writing-for-the-site)
- [Privacy: what goes public](#privacy-what-goes-public)
- [Checklist before building](#checklist-before-building)

## Field by field

### `features` and `assistant`

| Field | What to ask or assume |
| --- | --- |
| `features.chat` | On if they'll add an Anthropic API key. It costs about $0.002 per question on Haiku. |
| `features.githubActivity` | On if they have a public GitHub with real activity. An empty calendar looks worse than none. |
| `features.portrait` | Off unless they give you a photo and you've run `npm run ascii` successfully. |
| `features.easterEggs` | On by default; off for a more formal portfolio. |
| `assistant.name` / `.title` | A short, friendly name (one word, ≤ 8 letters reads best in the FIGlet banner) and a title such as "CoPilot" or "Assistant". |

### `profile`

| Field | Notes |
| --- | --- |
| `name` | Full name as they want it shown. |
| `firstName` | What the site calls them: the greeting reads "Hi, I am {firstName}". Use their nickname if they go by one. Long names make the greeting wide; up to ~10 letters fits well. |
| `handle` | Lower-case, no spaces: the terminal prompt (`handle@portfolio`), title bar, Extensions publisher. Their GitHub username often works. |
| `pronouns` | Ask, or default to they/them. Only the chat assistant uses these. |
| `monogram` | Their initials, two letters, `a`–`z`. |
| `role` | Current title, or the role they want ("Frontend Engineer"). |
| `yearsOfExperience` | A string: `"3+"`, `"5"`. |
| `location` | City, region, country as they'd say it. `address` is the same split for search engines (ISO country code). |
| `openToWork` | Shows a green "Open to work" badge and changes the README's pitch. |
| `email`, `links.github`, `links.linkedin` | Required. |
| `links.extra` | One more link (Behance, Dribbble, a blog, X…) with a label and a 3–6 word blurb, or `null`. The icon is picked from the URL's host. |
| `githubUser` | GitHub username for the activity pane (can differ from `links.github` if the projects live elsewhere). |
| `tagline` | One sentence: what they build and for whom. Shown under the greeting and in search results. |
| `summary` | 2–3 sentences: experience, strengths, core stack. The about.tsx file and the chat use it. |
| `coreStack` | 4–6 technologies they'd want to be hired for. Shown in the hero, the title, search suggestions. |
| `focus` | 3–5 short phrases ("Internal developer tools"). |
| `pitch` | One sentence for the "work with me" section: "If you're building …, I'd love to hear about it." |
| `highlights` | 2–4 achievements, short. The chat cites them. They need not be numbers. |

### `experience`

Newest first. `location` is `"Mode · Place"`: `"Remote · Berlin, Germany"`, `"Hybrid · Austin, TX"`,
`"On-site · Lisbon"`. `start`/`end` are `"Month YYYY"` spelled out (`end: "Present"` with
`current: true`), and `startISO` is `"YYYY-MM"`. `id` is a slug. The experience terminal command
counts bullets, so 3–5 per role is the sweet spot.

### `projects`

Side projects, or work projects they're allowed to show. `slug` becomes the file name. Spread `file`
across `ts`, `py`, `json`, `yml` and `js` so the `projects/` folder looks like a real polyglot repo.
Pick the language that fits the project when there's an obvious one. `url` is optional. `kind` is a
short label ("Web App", "CLI", "Chrome Extension"). 3–5 `features`, 2–4 `tags`.

### `education`, `story`, `gear`, `skills`

- `education.grade` and `honors` are strings or `null`: write them as the person would ("GPA 3.8",
  "First-class honours").
- `story` is first person, 3–6 steps, from first line of code to today. Mention project and company
  names exactly as written in `projects` / `experience` and they link automatically. Empty array
  hides the section; don't invent a story they didn't tell you.
- `gear` is optional fun (laptop, keyboard…). Empty array hides GEAR.md.
- `skills` groups map to Extensions sections. Use the exact names in `src/data/skill-icons.ts`
  where they exist ("Node.js", not "NodeJS") so they get brand icons; add entries for the rest.

## Writing for the site

- The README speaks in the first person ("I'd love to work with you"); the chat assistant speaks
  about them in the third person. Don't mix these up in profile text: `summary` and `tagline` work
  best without pronouns at all ("Full-stack engineer who builds…").
- Keep bullets short and concrete: one line each, starting with a verb. The editor renders them as
  code-style lines, so long bullets wrap awkwardly.
- Use their words. Polish grammar, but don't inflate claims or add metrics they didn't give you. The
  chat assistant is told never to invent anything, and it can only be as accurate as this file.

## Privacy: what goes public

Everything in `profile.ts` ends up public, and the chat assistant will repeat any of it to anyone
who asks. Before filling in a current or recent employer, **ask how much they want to share**, and
default to the cautious side:

- Prefer short, outcome-level bullets ("Built internal tools that automate operational workflows")
  over a detailed account of every system they built.
- Leave out client names, internal tool names, vendor or integration lists, security work
  specifics, and exact numbers unless they say these are fine to publish. A resume sent to one
  recruiter isn't the same as a website anyone can read.
- The same detail can leak through other fields: `highlights`, `skill-icons.ts` descriptions,
  `story` and project text. Check all of them, not only the experience bullets.
- Don't add a personal contact field (phone, home address) that the starter doesn't already have.

## Checklist before building

- [ ] No sample data left: search the project for "Alex", "Rivera", "Northwind", "Brightpath",
      "Trailmix", "Pantry", "Tabkeeper", "example.com" and "alexrivera".
- [ ] `npm run banners` run after setting `firstName`, `monogram` and `assistant`.
- [ ] Every skill name either matches `skill-icons.ts` or has been added there.
- [ ] Employer details checked against what the person agreed to make public.
