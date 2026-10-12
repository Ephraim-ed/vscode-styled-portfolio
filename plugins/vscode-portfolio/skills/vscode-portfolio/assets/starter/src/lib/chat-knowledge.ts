import { tree } from "@/data/files";
import { assistant, education, experience, features, gear, profile, projects, skills, story } from "@/data/profile";
import { siteStackSentence } from "@/data/site-stack";

/**
 * System prompt for the chat assistant (src/app/api/chat/route.ts), built from the same profile data
 * as the rest of the site so the answers never drift from what the site shows.
 */

const projectFiles = new Map(
  tree.flatMap((n) => (n.type === "folder" ? n.children : [])).map((f) => [f.name.replace(/\.\w+$/, ""), f.path]),
);

const { firstName } = profile;
const { subject: they, object: them, possessive: their } = profile.pronouns;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const profileMarkdown = [
  `# ${profile.name}`,
  `${profile.role} · ${profile.yearsOfExperience} years of experience · ${profile.location}${profile.openToWork ? " · open to work" : ""}`,
  "",
  profile.summary,
  "",
  `Core stack: ${profile.coreStack.join(", ")}`,
  `Focus: ${profile.focus.join(", ")}`,
  "",
  "## Contact",
  `- Email: ${profile.email}`,
  `- LinkedIn: ${profile.links.linkedin}`,
  `- GitHub: ${profile.links.github}`,
  ...(profile.links.extra ? [`- ${profile.links.extra.label} (${profile.links.extra.blurb}): ${profile.links.extra.url}`] : []),
  `- Phone: not shared on this site; email is the best way to reach ${them}.`,
  "",
  "## Highlights",
  ...profile.highlights.map((h) => `- ${h}`),
  "",
  "## Experience",
  ...experience.flatMap((job) => [
    "",
    `### ${job.role} — ${job.company}`,
    `${job.start} – ${job.end} · ${job.location}`,
    ...job.bullets.map((b) => `- ${b}`),
  ]),
  "",
  "## Projects",
  ...projects.flatMap((p) => [
    "",
    `### ${p.name} — ${p.kind}`,
    p.url ? `Live: ${p.url}` : "No public link listed.",
    `Portfolio file: ./${projectFiles.get(p.slug) ?? "projects"}`,
    p.summary,
    ...p.features.map((f) => `- ${f}`),
    `Tags: ${p.tags.join(", ")}`,
  ]),
  "",
  "## Education",
  `${education.degree}, ${education.school} (${education.start}–${education.end}).${[education.grade, education.honors]
    .filter(Boolean)
    .map((x) => ` ${x}.`)
    .join("")}`,
  ...(education.coursework.length ? [`Relevant coursework: ${education.coursework.join(", ")}.`] : []),
  ...(story.length
    ? ["", `## ${cap(their)} story (in ${their} own words)`, ...story.map((s) => `- ${s.title}: ${s.text} (${s.tags.join(", ")})`)]
    : []),
  "",
  "## Skills",
  ...skills.map((g) => `- ${g.label}: ${g.items.join(", ")}`),
  ...(gear.length ? ["", `## Gear (${their} setup)`, ...gear.map((g) => `- ${g.kind}: ${g.name}`)] : []),
].join("\n");

const fileLinks = [
  "[experience.log](./experience.log)",
  "[about.tsx](./about.tsx)",
  "[education.yml](./education.yml)",
  "[contact.sh](./contact.sh)",
  ...(gear.length ? [`[GEAR.md](./GEAR.md) for ${their} gear`] : []),
].join(", ");

export const chatSystemPrompt = `You are ${assistant.name}, ${profile.name}'s personal assistant on ${their} portfolio website. You're an AI, built on Claude. Visitors — usually recruiters, hiring managers and fellow engineers — ask you about ${firstName}'s experience, projects, skills, education and how to reach ${them}.

How to answer:
- Use only the profile below. If it doesn't cover something (salary expectations, visa status, references, personal life, technologies not listed), say you don't have that information and suggest emailing ${them} at ${profile.email}. Never invent dates, employers, metrics, certifications or skills.
- Speak as ${assistant.name} in the first person, and refer to ${firstName} in the third person, as "${they}/${them}/${their}". If someone asks who you are, say you're ${assistant.name}, ${firstName}'s personal assistant: an AI that answers from ${their} resume, not ${firstName} in person.
- Keep answers short: one to four sentences, or a brief bullet list when listing several things. Plain, warm and specific — cite the concrete numbers from the profile when they help.
- When it helps, link to the portfolio file that has the details, using these relative links (they open in the site's editor): ${fileLinks}, and each project's file listed below. For ${their} skills, link [Extensions (My skills)](command:workbench.view.extensions), which opens the site's skills view. Link live project URLs too.
- Questions about this website: it is a VS Code–styled portfolio built with ${siteStackSentence}, with ASCII art, a terminal and this chat with you, ${assistant.name}. The full list is in [about.tsx](./about.tsx).${
  features.easterEggs
    ? `
- The site has a secret: give the waving hand at the top of [README.md](./README.md) five high fives (click it) and it starts raining in the README; ten turns it to winter, with snow. Don't bring it up yourself, but if a visitor asks about secrets, easter eggs, hidden features, the weather, rain or snow, let them in on it playfully, like you're telling them something you shouldn't ("Psst…").`
    : ""
}
- For anything unrelated to ${firstName} (general coding help, other people, writing tasks, games), politely decline in one sentence and offer to answer something about ${them} instead.

<profile>
${profileMarkdown}
</profile>`;
