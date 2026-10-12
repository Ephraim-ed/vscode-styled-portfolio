# vscode-portfolio

A [Claude Code](https://claude.com/claude-code) plugin that builds a developer portfolio styled as a VS Code workbench, from your resume.

Each resume section becomes a file in the explorer: `README.md`, `about.tsx`, `experience.log`, `education.yml`, `contact.sh` and one file per project. Visitors get tabs, a working terminal (`help`, `neofetch`, `projects`…), a command palette, five editor themes, and your skills listed as installed extensions.

**See it live:** [ephraimvelasco.dev](https://www.ephraimvelasco.dev), the portfolio this plugin was made from.

## Install

In Claude Code:

```
/plugin marketplace add Ephraim-ed/vscode-portfolio
/plugin install vscode-portfolio@ephraim-skills
```

## Use

Ask for a portfolio and share your resume, CV or LinkedIn profile:

> Make me a VS Code–style portfolio from my resume (attached)

Or run the skill directly with `/vscode-portfolio:vscode-portfolio`.

Claude copies a tested Next.js starter into a new folder and fills in one file, `src/data/profile.ts`, with your details. It asks what you want to share about your current job, regenerates the ASCII lettering with your name, and checks that the site builds.

## Optional extras

You can turn each one on or off:

| Extra | What it needs |
| --- | --- |
| AI chat assistant that answers visitors' questions about you | An [Anthropic API key](https://console.anthropic.com) |
| GitHub activity: your contribution calendar and recent repos in the sidebar | A public GitHub account |
| ASCII portrait made from your photo | [ascii-image-converter](https://github.com/TheZoraiz/ascii-image-converter) |
| Easter eggs: a runner game and high-five weather | Nothing |

## Requirements

- Node.js 22.18+ or 23.6+
- npm

The generated site uses Next.js 16, React 19, Tailwind CSS 4 and Shiki, and deploys to Vercel as is.

## What's in this repo

```
.claude-plugin/marketplace.json           the marketplace (lists this plugin)
plugins/vscode-portfolio/
  .claude-plugin/plugin.json              the plugin manifest
  skills/vscode-portfolio/
    SKILL.md                              the workflow Claude follows
    references/                           architecture map and content guide
    scripts/new-portfolio.sh              copies the starter into a new project
    assets/starter/                       the Next.js starter (sample person: Alex Rivera)
```
