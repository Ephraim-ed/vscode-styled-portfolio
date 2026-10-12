import { features } from "@/data/profile";
import { CHAT_MODEL } from "@/lib/chat-config";

/**
 * What this portfolio is built with. One list for both places it's told: the `builtWith` block in
 * about.tsx, and the chat assistant's answer when someone asks how the site was made. Optional
 * features only appear when they're on.
 */
export const siteStack: { label: string; items: string[] }[] = [
  { label: "framework", items: ["Next.js 16 (App Router)", "React 19", "TypeScript"] },
  { label: "styling", items: ["Tailwind CSS 4", "shadcn/ui", "Radix UI", "JetBrains Mono"] },
  { label: "editor", items: ["Shiki (syntax highlighting, 5 themes)", "react-markdown", "remark-gfm"] },
  { label: "ui", items: ["cmdk (command palette)", "Zustand (state)", "Sonner (toasts)", "Motion", "React Icons"] },
  ...(features.chat ? [{ label: "ai", items: [`Claude API (${CHAT_MODEL})`, "Anthropic TypeScript SDK"] }] : []),
  { label: "art", items: ["FIGlet (ASCII lettering)", ...(features.easterEggs ? ["HTML Canvas (runner game, weather)"] : [])] },
  ...(features.githubActivity ? [{ label: "data", items: ["GitHub API (activity sidebar)"] }] : []),
];

/** "Next.js 16 (App Router), React 19, … and GitHub API (activity sidebar)". */
export const siteStackSentence = (() => {
  const all = siteStack.flatMap((g) => g.items);
  return `${all.slice(0, -1).join(", ")} and ${all.at(-1)}`;
})();
