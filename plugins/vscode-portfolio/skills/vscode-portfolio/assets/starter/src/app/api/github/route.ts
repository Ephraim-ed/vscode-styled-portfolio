import { features, profile } from "@/data/profile";
import { GITHUB_PROFILE, GITHUB_USER, type ContributionDay, type GithubActivity, type GithubRepo } from "@/lib/github";

/**
 * The sidebar's GitHub activity: the contribution calendar (from the public profile's calendar
 * fragment, the same HTML github.com renders, since the REST API doesn't expose it) and the most
 * recently pushed repos.
 *
 * Cached and refreshed at most hourly, so visitors never spend GitHub's 60-requests-an-hour
 * anonymous limit. GITHUB_TOKEN (optional) raises that limit for the repos call.
 */

export const revalidate = 3600;

const USER_AGENT = `${profile.handle}-portfolio`;
const REPOS_SHOWN = 5;

async function contributions(): Promise<GithubActivity["contributions"]> {
  const res = await fetch(`https://github.com/users/${GITHUB_USER}/contributions`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`contributions: HTTP ${res.status}`);
  const html = await res.text();

  // Each day is a <td data-date data-level id>; its count is in the <tool-tip for=id> after it
  // ("No contributions on May 4th." / "3 contributions on May 5th.").
  const counts = new Map<string, number>();
  for (const [, id, text] of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = /^\s*([\d,]+) contributions?/.exec(text);
    counts.set(id, n ? Number(n[1].replace(/,/g, "")) : 0);
  }
  const days: ContributionDay[] = [];
  for (const [tag] of html.matchAll(/<td\b[^>]*\bdata-date="[^"]*"[^>]*>/g)) {
    const attr = (name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1] ?? "";
    const level = Number(attr("data-level"));
    days.push({
      date: attr("data-date"),
      count: counts.get(attr("id")) ?? 0,
      level: (level >= 0 && level <= 4 ? level : 0) as ContributionDay["level"],
    });
  }
  if (!days.length) throw new Error("contributions: calendar not found");
  days.sort((a, b) => a.date.localeCompare(b.date));

  const total = /([\d,]+)\s+contributions?\s+in the last year/.exec(html);
  return {
    total: total ? Number(total[1].replace(/,/g, "")) : days.reduce((n, d) => n + d.count, 0),
    days,
  };
}

async function repos(): Promise<GithubRepo[]> {
  const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=pushed&per_page=30`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": USER_AGENT,
      ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
    },
  });
  if (!res.ok) throw new Error(`repos: HTTP ${res.status}`);
  const list: {
    name: string;
    html_url: string;
    description: string | null;
    language: string | null;
    pushed_at: string;
    stargazers_count: number;
    fork: boolean;
    archived: boolean;
  }[] = await res.json();
  return list
    .filter((r) => !r.fork && !r.archived)
    .slice(0, REPOS_SHOWN)
    .map((r) => ({
      name: r.name,
      url: r.html_url,
      description: r.description,
      language: r.language,
      pushedAt: r.pushed_at,
      stars: r.stargazers_count,
    }));
}

export async function GET() {
  if (!features.githubActivity) return Response.json({ error: "GitHub activity is turned off." }, { status: 404 });
  const [calendar, recent] = await Promise.allSettled([contributions(), repos()]);
  for (const r of [calendar, recent]) {
    if (r.status === "rejected") console.error("[github]", r.reason instanceof Error ? r.reason.message : r.reason);
  }
  const body: GithubActivity = {
    user: GITHUB_USER,
    url: GITHUB_PROFILE,
    contributions: calendar.status === "fulfilled" ? calendar.value : null,
    repos: recent.status === "fulfilled" ? recent.value : null,
  };
  const failed = !body.contributions && !body.repos;
  return Response.json(body, { status: failed ? 502 : 200 });
}
