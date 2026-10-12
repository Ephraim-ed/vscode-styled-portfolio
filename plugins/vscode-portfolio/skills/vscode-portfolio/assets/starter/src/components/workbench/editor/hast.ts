import type { Element, ElementContent } from "hast";

/** Small helpers for reading the markdown preview's HTML tree (hast). */

export const isElement = (node: ElementContent, tag: string): node is Element =>
  node.type === "element" && node.tagName === tag;

export const textOf = (node: ElementContent): string =>
  node.type === "text" ? node.value : node.type === "element" ? node.children.map(textOf).join("") : "";

/** Drops whitespace-only text nodes. */
export const meaningful = (nodes: ElementContent[]) => nodes.filter((n) => n.type !== "text" || n.value.trim());
