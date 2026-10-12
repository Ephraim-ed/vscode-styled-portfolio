import { profile } from "@/data/profile";

/** Set NEXT_PUBLIC_SITE_URL in production; Vercel deployments fall back to their production URL. */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const siteTitle = `${profile.name} — ${profile.role}`;
export const siteDescription = `${profile.tagline} ${profile.yearsOfExperience} years with ${profile.coreStack.join(", ")}.`;
