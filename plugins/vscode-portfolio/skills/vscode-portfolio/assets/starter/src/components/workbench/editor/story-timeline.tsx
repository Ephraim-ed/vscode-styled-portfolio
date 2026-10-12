import type { Element, ElementContent } from "hast";
import type { CSSProperties, ReactNode } from "react";
import type { IconType } from "react-icons";
import { SiC, SiCplusplus, SiHtml5, SiPython, SiRaspberrypi, SiReact } from "react-icons/si";
import { TbBriefcase, TbPoint } from "react-icons/tb";

import { isElement, meaningful, textOf } from "./hast";
import { openInEditor } from "./link-cards";

/** A step's badge: the logo of its first technology. */
const STEP_ICONS: Record<string, IconType> = {
  HTML: SiHtml5,
  C: SiC,
  Python: SiPython,
  "C++": SiCplusplus,
  "Raspberry Pi": SiRaspberrypi,
  React: SiReact,
};

type Step = { title: string; body: ElementContent[]; tags: string[] };

/** Inline markdown (text, links, emphasis, code) back into React. */
function inline(nodes: ElementContent[]): ReactNode[] {
  return nodes.map((n, i) => {
    if (n.type === "text") return n.value;
    if (n.type !== "element") return null;
    const children = inline(n.children);
    if (n.tagName === "a") {
      const href = String(n.properties.href ?? "");
      const web = /^https?:/.test(href);
      return (
        <a
          key={i}
          href={href}
          target={web ? "_blank" : undefined}
          rel={web ? "noopener noreferrer" : undefined}
          onClick={(e) => openInEditor(e, href)}
        >
          {children}
        </a>
      );
    }
    if (n.tagName === "strong") return <strong key={i}>{children}</strong>;
    if (n.tagName === "em") return <em key={i}>{children}</em>;
    if (n.tagName === "code") return <code key={i}>{children}</code>;
    return textOf(n);
  });
}

/** Trims the whitespace a hard break leaves at the edges of a line. */
function trimLine(nodes: ElementContent[]) {
  const line = meaningful(nodes).map((n) => (n.type === "text" ? { ...n } : n));
  const first = line[0];
  const last = line[line.length - 1];
  if (first?.type === "text") first.value = first.value.trimStart();
  if (last?.type === "text") last.value = last.value.trimEnd();
  return line;
}

/** Each item is a bold title, its text and a line of `tags`, split by hard breaks; or null. */
function parseSteps(list: Element): Step[] | null {
  const steps: Step[] = [];
  for (const li of list.children.filter((n): n is Element => isElement(n, "li"))) {
    const [para] = meaningful(li.children);
    const content = para && isElement(para, "p") ? para.children : li.children;
    const lines: ElementContent[][] = [[]];
    for (const n of content) {
      if (isElement(n, "br")) lines.push([]);
      else lines[lines.length - 1].push(n);
    }
    const [head, ...rest] = lines.map(trimLine);
    if (head.length !== 1 || !isElement(head[0], "strong")) return null;
    const tagLine = rest.length > 1 && rest[rest.length - 1].every((n) => isElement(n, "code") || !textOf(n).trim());
    const tags = tagLine ? rest.pop()!.filter((n) => isElement(n, "code")).map((n) => textOf(n)) : [];
    const body = rest.flatMap((line, i): ElementContent[] => (i ? [{ type: "text", value: " " }, ...line] : line));
    steps.push({ title: textOf(head[0]), body, tags });
  }
  return steps.length ? steps : null;
}

/**
 * README's "My story" as a timeline: a card per step, each with its first technology's logo as a badge
 * on a line that runs from blue to green, arriving at today (the last step).
 */
export function storyTimeline(list: Element) {
  const steps = parseSteps(list);
  if (!steps) return null;
  const last = steps.length - 1;
  return (
    <ol className="md-story">
      {steps.map((step, i) => {
        const Icon = i === last ? TbBriefcase : (STEP_ICONS[step.tags[0]] ?? TbPoint);
        const at = (n: number) => `${Math.round((n / (last || 1)) * 100)}%`;
        return (
          <li
            key={step.title}
            className={i === last ? "md-story-step is-now" : "md-story-step"}
            style={{ "--from": at(i), "--to": at(i + 1) } as CSSProperties}
          >
            <span aria-hidden className="md-story-badge">
              <Icon />
            </span>
            <div className="md-story-card">
              <div className="md-story-head">
                <span aria-hidden className="md-story-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <strong className="md-story-title">{step.title}</strong>
              </div>
              <p className="md-story-text">{inline(step.body)}</p>
              {step.tags.length > 0 && (
                <ul className="md-story-tags" aria-label="Tech">
                  {step.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
