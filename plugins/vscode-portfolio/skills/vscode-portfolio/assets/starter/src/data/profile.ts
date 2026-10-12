/**
 * Single source of truth for the portfolio.
 * Every virtual file in the editor, the terminal, the extensions view, the source-control graph and
 * the chat assistant's knowledge is generated from this file — edit it here.
 *
 * The values below are a sample person (Alex Rivera). Replace all of them.
 */

/* ------------------------------------------------------------------ */
/* Site settings                                                       */
/* ------------------------------------------------------------------ */

/** Optional features. Turning one off hides every trace of it (UI, README sections, commands). */
export const features = {
  /** AI chat assistant docked on the right; answers from this file. Needs ANTHROPIC_API_KEY. */
  chat: true,
  /** Contribution calendar and recent repos under the sidebar, for `profile.githubUser`. */
  githubActivity: true,
  /** README hero shows the ASCII portrait (src/data/portrait.ts, from `npm run ascii`) instead of the greeting. */
  portrait: false,
  /** Runner game, high-five weather (rain, snow, shutdown), hidden terminal commands, UI sounds. */
  easterEggs: true,
};

/** The chat assistant's name, shown in its panel, the status bar and the README. */
export const assistant = { name: "Nova", title: "CoPilot" };

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export const profile = {
  name: "Alex Rivera",
  /** What the site calls them: the greeting ("Hi, I am Alex"), welcome toast and chat. */
  firstName: "Alex",
  /** Lower-case handle: the terminal prompt (alex@portfolio), title bar and Extensions publisher. */
  handle: "alexrivera",
  /** How the chat assistant refers to them. */
  pronouns: { subject: "they", object: "them", possessive: "their" },
  /** Two letters (a–z) drawn as the pixel logo: favicon, app icon, the runner game's hero. */
  monogram: "ar",
  role: "Full-Stack Engineer",
  yearsOfExperience: "4+",
  location: "Austin, TX, USA",
  /** For search engines (JSON-LD). */
  address: { locality: "Austin", region: "TX", country: "US" },
  openToWork: true,
  email: "alex.rivera@example.com",
  links: {
    github: "https://github.com/alexrivera",
    linkedin: "https://linkedin.com/in/alexrivera",
    /** One more link beside GitHub and LinkedIn (Behance, Dribbble, a blog…), or null. */
    extra: { label: "Blog", url: "https://alexrivera.dev", blurb: "Writing about the web" } as {
      label: string;
      url: string;
      blurb: string;
    } | null,
  },
  /** GitHub username for the activity pane (features.githubActivity). */
  githubUser: "alexrivera",
  tagline: "Full-stack engineer who builds fast, accessible web apps and the tools teams use to ship them.",
  summary:
    "Full-stack engineer with 4+ years of experience building customer-facing web apps and internal tools. Skilled in React, Next.js, Node.js, PostgreSQL and AWS, with a focus on performance, accessibility and developer experience.",
  coreStack: ["React", "Next.js", "Node.js", "PostgreSQL", "AWS"],
  /** What they focus on: the about.tsx <Focus> list. */
  focus: ["Customer-facing web apps", "Internal developer tools", "Performance and accessibility", "Design systems"],
  /** One sentence for the README's "work with me" pitch: what kind of work they want. */
  pitch: "If you're building web products or the tools behind them, I'd love to hear about it.",
  highlights: [
    "Cut page load times by 60% across a checkout flow",
    "Built a component library used by 4 product teams",
    "Led the migration of a monolith's frontend to Next.js",
  ],
} as const;

export type Experience = {
  id: string;
  company: string;
  role: string;
  /** "Mode · Place": "Remote · Berlin, Germany", "Hybrid · Austin, TX", "On-site · Lisbon". */
  location: string;
  /** "Month YYYY", spelled out: experience.log turns it into YYYY-MM. */
  start: string;
  end: string;
  startISO: string;
  current?: boolean;
  bullets: string[];
};

export const experience: Experience[] = [
  {
    id: "northwind",
    company: "Northwind Labs",
    role: "Software Engineer",
    location: "Hybrid · Austin, TX",
    start: "March 2022",
    end: "Present",
    startISO: "2022-03",
    current: true,
    bullets: [
      "Build and maintain the customer dashboard (Next.js, Node.js, PostgreSQL).",
      "Cut page load times by 60% across the checkout flow.",
      "Built a component library used by 4 product teams.",
      "Mentor new engineers and run frontend guild sessions.",
    ],
  },
  {
    id: "brightpath",
    company: "Brightpath Studio",
    role: "Frontend Developer",
    location: "Remote · Denver, CO",
    start: "June 2020",
    end: "February 2022",
    startISO: "2020-06",
    bullets: [
      "Shipped marketing sites and web apps for a dozen clients.",
      "Introduced TypeScript and automated visual testing.",
    ],
  },
];

export type Project = {
  slug: string;
  name: string;
  kind: string;
  url?: string;
  /** The language its file in projects/ is written in. Mix them: the explorer looks like a real repo. */
  file: "ts" | "js" | "py" | "yml" | "json";
  summary: string;
  features: string[];
  tags: string[];
};

export const projects: Project[] = [
  {
    slug: "trailmix",
    name: "Trailmix",
    kind: "Web App",
    url: "https://trailmix.example.com",
    file: "ts",
    summary: "A trip planner that turns a list of places into a day-by-day route with offline maps.",
    features: ["Drag-and-drop itinerary", "Offline maps", "Shareable trip links"],
    tags: ["Next.js", "Mapbox", "PWA"],
  },
  {
    slug: "pantry",
    name: "Pantry",
    kind: "Mobile App",
    file: "py",
    summary: "A grocery tracker that scans receipts and reminds you before food expires.",
    features: ["Receipt scanning", "Expiry reminders", "Shared household lists"],
    tags: ["React Native", "Python", "OCR"],
  },
  {
    slug: "tabkeeper",
    name: "Tabkeeper",
    kind: "Chrome Extension",
    file: "json",
    summary: "Saves and restores groups of browser tabs as named sessions.",
    features: ["One-click sessions", "Sync across devices", "Keyboard shortcuts"],
    tags: ["Chrome Extension", "TypeScript"],
  },
];

export const education = {
  school: "University of Texas at Austin",
  degree: "BS Computer Science",
  start: "2016",
  end: "2020",
  /** "GPA 3.8", "GWA 1.25", "First-class honours"… or null. */
  grade: "GPA 3.8" as string | null,
  /** "Dean's List", "Magna cum laude"… or null. */
  honors: "Dean's List" as string | null,
  coursework: ["Data Structures & Algorithms", "Operating Systems", "Databases", "Computer Networks"],
};

/**
 * How they got into software, in their words: README.md's "My story", drawn as a timeline. Names of
 * projects and companies in the text link to their files automatically. Empty hides the section.
 */
export const story: { title: string; text: string; tags: string[] }[] = [
  {
    title: "Where it started",
    text: "I built my first website in high school, for my band, with plain HTML and CSS.",
    tags: ["HTML", "CSS"],
  },
  {
    title: "Getting serious",
    text: "In college I fell for JavaScript, then for React, and started taking freelance work.",
    tags: ["JavaScript", "React"],
  },
  {
    title: "Today",
    text: `Now I'm a software engineer at Northwind Labs with ${profile.yearsOfExperience} years of professional experience.`,
    tags: [...profile.coreStack],
  },
];

/** The setup behind the code, shown in GEAR.md. Empty hides the file. */
export const gear: { kind: string; name: string }[] = [
  { kind: "Laptop", name: "MacBook Pro 14-inch" },
  { kind: "Monitor", name: "Dell U2723QE" },
  { kind: "Keyboard", name: "Keychron K2" },
];

export type SkillGroup = { id: string; label: string; items: string[] };

/** Shown as installed extensions; icons and one-liners live in src/data/skill-icons.ts. */
export const skills: SkillGroup[] = [
  { id: "languages", label: "Languages", items: ["TypeScript", "JavaScript", "Python", "SQL", "HTML5", "CSS3"] },
  { id: "frontend", label: "Frontend", items: ["React", "Next.js", "Tailwind CSS"] },
  { id: "backend", label: "Backend", items: ["Node.js", "REST APIs", "GraphQL"] },
  { id: "data", label: "Data", items: ["PostgreSQL", "Redis"] },
  { id: "cloud", label: "Cloud & DevOps", items: ["AWS", "Docker", "Git", "GitHub"] },
  { id: "testing", label: "Testing", items: ["Playwright", "Vitest"] },
];
