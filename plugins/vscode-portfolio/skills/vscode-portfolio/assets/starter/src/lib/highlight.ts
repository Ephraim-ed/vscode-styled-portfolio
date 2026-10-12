import { createHighlighter, type ShikiTransformer } from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { Element, ElementContent } from "hast";

import { asciiArtLines, fileSources, resolveWorkspaceHref, type VirtualFileSource } from "@/data/files";
import { themes } from "@/data/themes";

export type HighlightedFile = VirtualFileSource & { html: string; lineCount: number };

const LINK_RE = /https?:\/\/[^\s"'`<>)\]]+|[\w.+-]+@[\w-]+\.[a-z]{2,}(?:\.[a-z]{2,})?|\.\/[\w./-]*\w|command:[\w.]+\w/g;
const BULLET_RE = /^(?:[-*+>] |\d+\. )/;
const FONT_PROPS = ["font-style", "font-weight", "text-decoration"] as const;

/**
 * Shiki emits one inline style per token carrying a CSS variable for every
 * theme. That is ~150 bytes per token, so we collapse identical styles into
 * short classes and emit one stylesheet keyed by [data-theme].
 */
class StyleRegistry {
  private ids = new Map<string, string>();
  private themeKeys = themes.map((t) => t.id).sort((a, b) => b.length - a.length);

  classFor(style: string) {
    let id = this.ids.get(style);
    if (!id) {
      id = `sk${this.ids.size}`;
      this.ids.set(style, id);
    }
    return id;
  }

  css() {
    const rules: string[] = [];
    for (const [style, id] of this.ids) {
      const perTheme = new Map<string, string[]>();
      for (const decl of style.split(";")) {
        const [prop, value] = decl.split(":").map((s) => s.trim());
        if (!prop || !value || !prop.startsWith("--shiki-")) continue;
        const rest = prop.slice("--shiki-".length);
        const key = this.themeKeys.find((k) => rest === k || rest.startsWith(`${k}-`));
        if (!key) continue;
        const sub = rest.slice(key.length + 1);
        const cssProp = sub === "" ? "color" : FONT_PROPS.find((p) => p === sub);
        if (!cssProp) continue;
        perTheme.set(key, [...(perTheme.get(key) ?? []), `${cssProp}:${value}`]);
      }
      for (const [key, decls] of perTheme) {
        rules.push(`[data-theme="${key}"] .${id}{${decls.join(";")}}`);
      }
    }
    return rules.join("\n");
  }
}

function linkifyChildren(text: string): ElementContent[] | null {
  const out: ElementContent[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK_RE)) {
    const raw = match[0].replace(/[.,;:]+$/, "");
    const start = match.index;
    let href: string | null = null;
    if (raw.startsWith("http")) href = raw;
    else if (raw.startsWith("./") || raw.startsWith("command:")) href = resolveWorkspaceHref(raw) ? raw : null;
    else href = `mailto:${raw}`;
    if (!href) continue;
    if (start > last) out.push({ type: "text", value: text.slice(last, start) });
    out.push({
      type: "element",
      tagName: "span",
      properties: { className: ["code-link"], "data-href": href, role: "link", tabIndex: 0 },
      children: [{ type: "text", value: raw }],
    });
    last = start + raw.length;
  }
  if (!out.length) return null;
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

function lineLayout(source: string, tabSize: number) {
  const lines = source.split("\n");
  const indents = lines.map((l) => (l.trim() ? /^ */.exec(l)![0].length : -1));
  return lines.map((line, i) => {
    const indent = indents[i];
    if (indent === -1) {
      // Blank line: continue the guides of the surrounding block.
      const prev = indents.slice(0, i).reverse().find((n) => n !== -1) ?? 0;
      const next = indents.slice(i + 1).find((n) => n !== -1) ?? 0;
      return { hang: 0, guides: Math.floor(Math.min(prev, next) / tabSize) };
    }
    const bullet = BULLET_RE.exec(line.slice(indent));
    return {
      hang: indent + (bullet ? bullet[0].length : 0),
      guides: Math.floor(indent / tabSize),
    };
  });
}

function editorTransformer(registry: StyleRegistry, tabSize: number): ShikiTransformer {
  let layout: ReturnType<typeof lineLayout> = [];
  let art = new Set<number>();
  let artCols = 0;
  return {
    name: "portfolio-editor",
    pre(node) {
      delete node.properties.style;
      delete node.properties.tabindex;
      node.properties.className = ["shiki"];
    },
    code(node) {
      // Lines are display:block, so the "\n" text nodes between them would render as blank rows.
      node.children = node.children.filter((c) => !(c.type === "text" && c.value === "\n"));
    },
    line(node, line) {
      if (line === 1) {
        layout = lineLayout(this.source, tabSize);
        art = asciiArtLines(this.source);
        const lines = this.source.split("\n");
        artCols = Math.max(0, ...[...art].map((n) => lines[n - 1].length));
      }
      node.properties["data-line"] = line;
      if (art.has(line)) {
        // ASCII portrait: never wraps, scales to fit (see .line.art in globals.css).
        this.addClassToHast(node, "art");
        node.properties.style = `--art-cols:${artCols}`;
        node.properties["aria-hidden"] = "true";
        return;
      }
      const { hang, guides } = layout[line - 1] ?? { hang: 0, guides: 0 };
      const style = [hang && `--hang:${hang}`, guides && `--guides:${guides}`].filter(Boolean).join(";");
      if (style) node.properties.style = style;
    },
    span(node) {
      const style = node.properties.style;
      if (typeof style === "string") {
        delete node.properties.style;
        this.addClassToHast(node, registry.classFor(style));
      }
      const [child] = node.children as Element["children"];
      if (node.children.length === 1 && child.type === "text") {
        const linked = linkifyChildren(child.value);
        if (linked) node.children = linked;
      }
    },
  };
}

let cache: Promise<{ files: HighlightedFile[]; css: string }> | null = null;

/** Highlights every workspace file for all themes. Runs once at build time. */
export function highlightWorkspace() {
  cache ??= (async () => {
    const langs = [...new Set(fileSources.map((f) => f.lang))];
    const highlighter = await createHighlighter({
      themes: themes.map((t) => t.shiki),
      langs,
      engine: createJavaScriptRegexEngine(),
    });
    const registry = new StyleRegistry();
    const themeMap = Object.fromEntries(themes.map((t) => [t.id, t.shiki]));

    const files = fileSources.map((file): HighlightedFile => {
      const source = file.source.replace(/\n$/, "");
      const lineCount = source.split("\n").length;
      const html = highlighter.codeToHtml(source, {
        lang: file.lang,
        themes: themeMap,
        defaultColor: false,
        transformers: [editorTransformer(registry, file.tabSize)],
      });
      return { ...file, html, lineCount };
    });

    return { files, css: registry.css() };
  })();
  return cache;
}
