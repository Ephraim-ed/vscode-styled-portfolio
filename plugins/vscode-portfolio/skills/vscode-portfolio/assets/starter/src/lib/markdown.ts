import type { Element, ElementContent, Root, RootContent } from "hast";
import { defaultUrlTransform } from "react-markdown";

/**
 * react-markdown blanks URLs with unknown schemes. Let VS Code-style `command:` links through
 * (navigateHref only acts on the ones listed in src/data/files.ts) and keep the default for the rest.
 */
export const markdownUrlTransform = (url: string) => (url.startsWith("command:") ? url : defaultUrlTransform(url));

/** "I'd love to work with you" → "id-love-to-work-with-you". */
export const sectionSlug = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const textOf = (node: ElementContent): string =>
  node.type === "text" ? node.value : node.type === "element" ? node.children.map(textOf).join("") : "";

/** A fenced block in the given language (```ascii, ```mountains, …)? */
const isFence = (node: RootContent | undefined, lang: string) =>
  node?.type === "element" &&
  node.tagName === "pre" &&
  node.children.some(
    (c) => c.type === "element" && c.tagName === "code" && String(c.properties.className ?? "").includes(`language-${lang}`),
  );

/** Does the document open with the ```ascii greeting (the README)? */
const opensWithGreeting = (nodes: RootContent[]) => isFence(nodes.find((n) => n.type === "element"), "ascii");

/**
 * Rehype plugin: wraps each `##` heading and everything up to the next one in a
 * `<section data-section="<slug>">`, so the preview can style a whole section. When the document
 * opens with the greeting, everything before the first `##` becomes a `<header>` (the README hero),
 * its greeting, tagline and facts in a `<div class="md-hero-main">` above the ```mountains scenery;
 * and what follows its last `---` becomes a `<footer>` (the sign-off), the rule itself dropped, up to
 * any fence after it (the runner game, which closes the page after the footer).
 */
export function rehypeSections() {
  return (tree: Root) => {
    const out: RootContent[] = [];
    let section: Element | null = null;
    let footer: Element | null = null;
    let closing: RootContent[] = [];
    const firstHeading = tree.children.findIndex((n) => n.type === "element" && n.tagName === "h2");
    if (firstHeading > 0 && opensWithGreeting(tree.children.slice(0, firstHeading))) {
      const lastRule = tree.children.findLastIndex((n) => n.type === "element" && n.tagName === "hr");
      if (lastRule > firstHeading) {
        const after = tree.children.slice(lastRule + 1);
        const fence = after.findIndex((n) => n.type === "element" && n.tagName === "pre");
        footer = {
          type: "element",
          tagName: "footer",
          properties: {},
          children: (fence < 0 ? after : after.slice(0, fence)) as ElementContent[],
        };
        closing = fence < 0 ? [] : after.slice(fence);
        tree.children = tree.children.slice(0, lastRule);
      }
      const heroNodes = tree.children.slice(0, firstHeading) as ElementContent[];
      const horizon = heroNodes.findIndex((n) => isFence(n, "mountains"));
      const main = horizon < 0 ? heroNodes : heroNodes.slice(0, horizon);
      const hero: Element = {
        type: "element",
        tagName: "header",
        properties: {},
        children: [
          { type: "element", tagName: "div", properties: { className: ["md-hero-main"] }, children: main },
          ...(horizon < 0 ? [] : heroNodes.slice(horizon)),
        ],
      };
      tree.children = [hero, ...tree.children.slice(firstHeading)];
    }
    for (const node of tree.children) {
      if (node.type === "element" && node.tagName === "h2") {
        section = { type: "element", tagName: "section", properties: { dataSection: sectionSlug(textOf(node)) }, children: [node] };
        out.push(section);
      } else if (section) {
        if (node.type === "element" && (node.tagName === "ul" || node.tagName === "ol")) {
          node.properties.dataSection = section.properties.dataSection;
        }
        section.children.push(node as ElementContent);
      } else {
        out.push(node);
      }
    }
    if (footer) out.push(footer, ...closing);
    tree.children = out;
  };
}
