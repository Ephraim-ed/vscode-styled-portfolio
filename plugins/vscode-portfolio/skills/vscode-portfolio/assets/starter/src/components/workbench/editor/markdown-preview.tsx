"use client";

import type { Element } from "hast";
import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { IconType } from "react-icons";
import { SiClaude } from "react-icons/si";
import {
  TbCoffee,
  TbDeviceDesktop,
  TbDeviceLaptop,
  TbDeviceMobile,
  TbHeadset,
  TbHeartFilled,
  TbKeyboard,
  TbMouse,
  TbTool,
} from "react-icons/tb";

import { MY_STORY, WORK_WITH_ME } from "@/data/files";
import { features } from "@/data/profile";
import { markdownUrlTransform, rehypeSections, sectionSlug } from "@/lib/markdown";
import { cn } from "@/lib/utils";

import { AsciiPortrait } from "./ascii-portrait";
import { DinoRunner } from "./dino-runner";
import { HeroPrompt } from "./greeting";
import { isElement, textOf } from "./hast";
import { callingCard, linkCards, openInEditor } from "./link-cards";
import { storyTimeline } from "./story-timeline";
import { WeatherLayer } from "./weather";

/** The call-to-action section, whose contact links render as a calling card. */
const WORK_SLUG = sectionSlug(WORK_WITH_ME);
/** "My story", whose steps render as a timeline. */
const STORY_SLUG = sectionSlug(MY_STORY);

/** A ```dino fence: its text is what the raw file shows; the preview swaps in the game. */
const isDinoFence = (pre: Element) => {
  const code = pre.children[0];
  return !!code && isElement(code, "code") && String(code.properties.className ?? "").includes("language-dino");
};

const GEAR_ICONS: Record<string, IconType> = {
  laptop: TbDeviceLaptop,
  monitor: TbDeviceDesktop,
  mouse: TbMouse,
  keyboard: TbKeyboard,
  phone: TbDeviceMobile,
  headset: TbHeadset,
};

/** GEAR.md's "Gear | Model" table renders as cards, each with an icon for the kind of device. */
function gearCards(table: Element) {
  const sections = table.children.filter((n): n is Element => n.type === "element");
  const rowsOf = (tag: string) =>
    sections
      .filter((s) => s.tagName === tag)
      .flatMap((s) => s.children.filter((n): n is Element => isElement(n, "tr")))
      .map((tr) => tr.children.filter((n): n is Element => n.type === "element").map((cell) => textOf(cell).trim()));
  const [head] = rowsOf("thead");
  if (head?.join("|") !== "Gear|Model") return null;
  return (
    <ul className="md-gear">
      {rowsOf("tbody").map(([kind, model]) => {
        const Icon = GEAR_ICONS[kind.toLowerCase()] ?? TbTool;
        return (
          <li key={model}>
            <span className="md-gear-icon">
              <Icon aria-hidden />
            </span>
            <span className="md-gear-kind">{kind}</span>
            <span className="md-gear-model">{model}</span>
          </li>
        );
      })}
    </ul>
  );
}

type MountainLayer = "sky" | "far" | "near";

/**
 * Splits the mountain art into layers, so they can drift apart as the README scrolls: the sky
 * (everything above the first peak: the sun and birds), the far range (dotted peaks, out in the open)
 * and the near ridges (their slopes, the shading inside them, the ground and the grass).
 */
function mountainLayers(text: string): Record<MountainLayer, string> {
  const rows = text.split("\n");
  const cols = Math.max(...rows.map((r) => r.length));
  const firstPeak = rows.findIndex((r) => /\.'|[/\\]/.test(r));
  const layers: Record<MountainLayer, string[]> = { sky: [], far: [], near: [] };
  rows.forEach((row, y) => {
    const cells: Record<MountainLayer, string[]> = { sky: [], far: [], near: [] };
    let inside = 0; // how many slopes deep: between a / and its \ is a near mountain
    for (let x = 0; x < cols; x++) {
      const ch = row[x] ?? " ";
      let layer: MountainLayer | null = null;
      if (ch !== " ") {
        if (y < firstPeak) {
          layer = "sky";
        } else if (ch === "/") {
          inside++;
          layer = "near";
        } else if (ch === "\\") {
          inside = Math.max(0, inside - 1);
          layer = "near";
        } else {
          layer = "_^:".includes(ch) || inside ? "near" : "far";
        }
      }
      for (const l of ["sky", "far", "near"] as const) cells[l].push(l === layer ? ch : " ");
    }
    for (const l of ["sky", "far", "near"] as const) layers[l].push(cells[l].join(""));
  });
  return { sky: layers.sky.join("\n"), far: layers.far.join("\n"), near: layers.near.join("\n") };
}

/** The near layer's runs (ridges, shading, grass, the rest), each with the column it starts at. */
function mountainRuns(near: string) {
  let col = 0;
  return (near.match(/\n|[/\\_]+|[:.']+|\^+|[^/\\_:.'^\n]+/g) ?? []).map((run) => {
    const at = col;
    col = run === "\n" ? 0 : col + run.length;
    return { run, at };
  });
}

/**
 * The sky's disc by day and by night (the layout sets <html data-sky>, by the visitor's clock): the
 * sun with its rays, drawn a column out from the art's disc, or the moon with its craters.
 */
const SUN = ["\\ .--. /", "-(    )-", "/ `--' \\"];
const MOON = [" .--.", "( .o )", " `--'"];
/** Stars for the night sky: row, column and glyph, clear of the birds and the moon. */
const STARS: [number, number, string][] = [
  [0, 6, "."],
  [0, 24, "+"],
  [1, 33, "."],
  [0, 56, "*"],
  [2, 50, "."],
  [1, 63, "+"],
  [2, 84, "."],
];

/** Each bird's flight: how long its lazy loop and its wingbeats take, and where in the loop it starts. */
const BIRD_FLIGHTS = [
  { glide: "13s", flap: "2.8s", delay: "-2s" },
  { glide: "10s", flap: "2.4s", delay: "-6s" },
  { glide: "16s", flap: "3.2s", delay: "-11s" },
];

/**
 * A ```mountains fence: line-art scenery, wider than the text column (see .md-mountains). The near
 * ridges' strokes are picked out and the shading and far range dimmed, so the layers read; as the
 * README scrolls, the sky and the far range lag behind the near ridges (a parallax). And it lives:
 * the birds (the sky's "v"s) flap and glide, the sun glows by day and the moon and stars by night,
 * and the grass sways in a wave.
 */
function Mountains({ text }: { text: string }) {
  const cols = Math.max(...text.split("\n").map((l) => l.length));
  const { sky, far, near } = mountainLayers(text);
  const cells = sky.split("\n").flatMap((row, y) => [...row].flatMap((ch, x) => (ch === " " ? [] : [{ ch, x, y }])));
  const birds = cells.filter((c) => c.ch === "v");
  // Everything else in the sky is its disc: drawn as the sun or the moon, wherever the art put it.
  const disc = cells.filter((c) => c.ch !== "v");
  const discAt = disc.length ? { x: Math.min(...disc.map((c) => c.x)), y: Math.min(...disc.map((c) => c.y)) } : null;
  const runs = mountainRuns(near); // the grass's wave travels by column
  return (
    <span
      role="img"
      aria-label="ASCII art of a mountain range"
      className="ascii-art md-mountains"
      style={{ "--art-cols": cols, "--art-width": "56rem" } as CSSProperties}
    >
      <span aria-hidden className="md-mountains-sky">
        {discAt && (
          <>
            <span className="md-sky-body md-sky-sun" style={{ left: `${discAt.x - 1}ch`, top: `${discAt.y}em` }}>
              {SUN.join("\n")}
            </span>
            <span className="md-sky-body md-sky-moon" style={{ left: `${discAt.x}ch`, top: `${discAt.y}em` }}>
              {MOON.join("\n")}
            </span>
          </>
        )}
        {STARS.map(([y, x, ch], i) => (
          <span
            key={`star-${i}`}
            className="md-star"
            style={{ left: `${x}ch`, top: `${y}em`, "--twinkle": `${-i * 0.7}s` } as CSSProperties}
          >
            {ch}
          </span>
        ))}
        {birds.map((bird, i) => {
          const flight = BIRD_FLIGHTS[i % BIRD_FLIGHTS.length];
          const style = { left: `${bird.x}ch`, top: `${bird.y}em`, "--glide": flight.glide, "--flap": flight.flap };
          return (
            <span key={i} className="md-bird" style={{ ...style, "--delay": flight.delay } as CSSProperties}>
              <span>v</span>
            </span>
          );
        })}
      </span>
      <span aria-hidden className="md-mountains-far">
        {far}
      </span>
      <span aria-hidden className="md-mountains-near">
        {runs.map(({ run, at }, i) =>
          /^[/\\_]/.test(run) ? (
            <span key={i} className="md-mountains-ridge">
              {run}
            </span>
          ) : /^[:.']/.test(run) ? (
            <span key={i} className="md-mountains-shade">
              {run}
            </span>
          ) : run.startsWith("^") ? (
            <span key={i} className="md-grass" style={{ "--x": at } as CSSProperties}>
              {run}
            </span>
          ) : (
            run
          ),
        )}
      </span>
    </span>
  );
}

/** A blockquote of "·"-separated facts ("2+ years · React · …") renders as rows of chips. */
function factChips(quote: Element) {
  const rows = quote.children
    .filter((n): n is Element => isElement(n, "p"))
    .map((p) => textOf(p).split(/\s+·\s+/).map((s) => s.trim()).filter(Boolean));
  if (!rows.length || rows.every((r) => r.length < 2)) return null;
  return (
    <div className="md-facts">
      {rows.map((chips, i) => (
        <ul key={i} className="md-chips">
          {chips.map((chip) => (
            <li key={chip} className={cn("md-chip", /open to work/i.test(chip) && "md-chip-status")}>
              {chip}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

/** The README's sign-off, "Made with ❤️, ☕, and ✻ by …", with marks for its emoji and Claude's logo for the ✻. */
function SignOff({ text }: { text: string }) {
  return (
    <p className="md-signoff">
      {text.split(/(❤\uFE0F?|☕|✻)/).map((part, i) =>
        part.startsWith("❤") ? (
          <TbHeartFilled key={i} role="img" aria-label="love" className="md-signoff-love" />
        ) : part === "☕" ? (
          <TbCoffee key={i} role="img" aria-label="coffee" className="md-signoff-coffee" />
        ) : part === "✻" ? (
          <SiClaude key={i} role="img" aria-label="Claude" className="md-signoff-claude" />
        ) : (
          part
        ),
      )}
    </p>
  );
}

/** "Scroll down", at the foot of the README hero: the rest of the README is below the fold. */
function ScrollCue() {
  const scrollOn = (e: React.MouseEvent<HTMLButtonElement>) => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    e.currentTarget.closest(".md-hero")?.nextElementSibling?.scrollIntoView({ behavior: calm ? "auto" : "smooth" });
  };
  return (
    <button type="button" className="md-scroll-cue" onClick={scrollOn}>
      <span aria-hidden className="md-scroll-cue-mouse" />
      Scroll down
    </button>
  );
}

/** The markdown preview: VS Code's preview, dressed up a little for the README. */
export function MarkdownPreview({ source }: { source: string }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {features.easterEggs && <WeatherLayer />}
      <div className="md-scroll vsc-scroll relative min-h-0 flex-1 overflow-y-auto">
        <article className="md-preview">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSections]}
            urlTransform={markdownUrlTransform}
            components={{
              pre: ({ node, children }) => (node && isDinoFence(node) ? <DinoRunner /> : <pre>{children}</pre>),
            header: ({ children }) => (
              <header className="md-hero">
                {children}
                <ScrollCue />
              </header>
            ),
            // The hero's greeting block (see rehypeSections) opens with the prompt.
            div: ({ className, children }) => (
              <div className={className}>
                {className === "md-hero-main" && <HeroPrompt />}
                {children}
              </div>
            ),
            section: ({ node, children }) => (
              <section data-section={String(node?.properties.dataSection ?? "")}>{children}</section>
            ),
            footer: ({ node, children }) => (
              <footer className="md-footer">{node ? <SignOff text={textOf(node).trim()} /> : children}</footer>
            ),
              code: ({ className, children }) =>
                className === "language-ascii" ? (
                  <AsciiPortrait text={String(children).replace(/\n$/, "")} />
                ) : className === "language-mountains" ? (
                  <Mountains text={String(children).replace(/\n$/, "")} />
                ) : (
                  <code className={className}>{children}</code>
                ),
              a: ({ href = "", children }) => (
                <a
                  href={href}
                  target={/^https?:/.test(href) ? "_blank" : undefined}
                  rel={/^https?:/.test(href) ? "noopener noreferrer" : undefined}
                  onClick={(e) => openInEditor(e, href)}
                >
                  {children}
                </a>
              ),
              ul: ({ node, children }) =>
                (node && (node.properties.dataSection === WORK_SLUG ? callingCard(node) : linkCards(node))) ?? (
                  <ul>{children}</ul>
                ),
              ol: ({ node, children }) =>
                (node?.properties.dataSection === STORY_SLUG && storyTimeline(node)) || <ol>{children}</ol>,
              blockquote: ({ node, children }) => (node && factChips(node)) ?? <blockquote>{children}</blockquote>,
              table: ({ node, children }) =>
                (node && gearCards(node)) ?? (
                  <div className="md-table">
                    <table>{children}</table>
                  </div>
                ),
            }}
          >
            {source}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
