import { profile } from "@/data/profile";

/**
 * The GitHub account behind the sidebar's activity pane (profile.githubUser): the one holding the
 * portfolio's project repos. profile.links.github is the address printed on the resume.
 */
export const GITHUB_USER: string = profile.githubUser;
export const GITHUB_PROFILE = `https://github.com/${GITHUB_USER}`;

export type ContributionDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 };

export type GithubRepo = {
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  pushedAt: string;
  stars: number;
};

/** What /api/github returns. Either half can be null if GitHub didn't answer for it. */
export type GithubActivity = {
  user: string;
  url: string;
  contributions: { total: number; days: ContributionDay[] } | null;
  repos: GithubRepo[] | null;
};

/** GitHub's own language colours, for common languages. Add any the account uses. */
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  "C#": "#178600",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Java: "#b07219",
  Kotlin: "#a97bff",
  Shell: "#89e051",
  Go: "#00add8",
  Dart: "#00b4ab",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Swift: "#f05138",
  "C++": "#f34b7d",
  C: "#555555",
  Vue: "#41b883",
  Svelte: "#ff3e00",
};
