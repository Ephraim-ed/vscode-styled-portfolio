"use client";

import type { Element } from "hast";
import { useRef, useState, type CSSProperties } from "react";
import type { IconType } from "react-icons";
import { VscArrowRight, VscExtensions, VscMail } from "react-icons/vsc";

import { basename, resolveWorkspaceHref, type WorkspaceTarget } from "@/data/files";
import { assistant, profile } from "@/data/profile";
import { linkIcon } from "@/lib/link-icons";
import { navigateHref } from "@/lib/navigation";

import { PixelLogo } from "../../pixel-logo";
import { FileIcon, FolderIcon } from "../file-icon";
import { isElement, meaningful, textOf } from "./hast";

const isWeb = (href: string) => /^https?:/.test(href);

/** Links in the preview open in the editor (or the chat, or the mail app); web links open a new tab. */
export function openInEditor(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (isWeb(href)) return;
  e.preventDefault();
  navigateHref(href);
}

type CardTarget = WorkspaceTarget | { type: "external"; label: string; icon: IconType };

/** Where a card leads: a workspace file, folder, view or the chat, or an email address or web page. */
function cardTarget(href: string): CardTarget | null {
  const target = resolveWorkspaceHref(href);
  if (target) return target;
  if (href.startsWith("mailto:")) return { type: "external", label: href.slice("mailto:".length), icon: VscMail };
  if (/^https?:\/\//.test(href)) {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");
    return { type: "external", label: host + url.pathname.replace(/\/$/, ""), icon: linkIcon(href) };
  }
  return null;
}

function CardIcon({ target }: { target: CardTarget }) {
  if (target.type === "external") return <target.icon aria-hidden className="size-4 text-link" />;
  if (target.type === "chat") return <span aria-hidden className="text-sm leading-none text-claude">✻</span>;
  if (target.type === "view") return <VscExtensions aria-hidden className="size-4 text-link" />;
  if (target.type === "folder") return <FolderIcon />;
  return <FileIcon name={basename(target.path)} />;
}

const cardPath = (target: CardTarget) =>
  "path" in target ? `${target.path}${target.type === "folder" ? "/" : ""}` : target.label;

type LinkItem = { href: string; title: string; description: string; target: CardTarget };

/** A list whose every item starts with a link ("- [About me](./about.tsx) — …"), or null. */
function parseLinks(list: Element): LinkItem[] | null {
  const items = list.children
    .filter((n): n is Element => isElement(n, "li"))
    .map((li) => {
      const [link, ...rest] = meaningful(li.children);
      if (!link || !isElement(link, "a")) return null;
      const href = String(link.properties.href ?? "");
      const target = cardTarget(href);
      if (!target) return null;
      const description = rest.map(textOf).join("").replace(/^\s*[—–-]\s*/, "").trim();
      return { href, title: textOf(link), description, target };
    });
  return items.length && items.every((i) => i !== null) ? (items as LinkItem[]) : null;
}

/** Points a card's spotlight at the mouse (see .md-card::before). */
function spotlight(e: React.PointerEvent<HTMLAnchorElement>) {
  if (e.pointerType !== "mouse") return;
  const card = e.currentTarget;
  const box = card.getBoundingClientRect();
  card.style.setProperty("--mx", `${Math.round(e.clientX - box.left)}px`);
  card.style.setProperty("--my", `${Math.round(e.clientY - box.top)}px`);
}

/**
 * A link list as cards: an icon tile, title, the text after the link as a description, and where it
 * leads along the bottom, with a spotlight that follows the mouse. Links can be portfolio files and
 * views, the chat, an email address or a web page.
 */
export function linkCards(list: Element) {
  const items = parseLinks(list);
  if (!items) return null;
  return (
    <ul className="md-cards">
      {items.map((c) => (
        <li key={c.href}>
          <a
            href={c.href}
            className="md-card"
            target={isWeb(c.href) ? "_blank" : undefined}
            rel={isWeb(c.href) ? "noopener noreferrer" : undefined}
            onClick={(e) => openInEditor(e, c.href)}
            onPointerMove={spotlight}
          >
            <span className="md-card-icon">
              <CardIcon target={c.target} />
            </span>
            <span className="md-card-body">
              <span className="md-card-title">{c.title}</span>
              {c.description && <span className="md-card-desc">{c.description}</span>}
            </span>
            <VscArrowRight aria-hidden className="md-card-arrow" />
            <span className="md-card-path">{cardPath(c.target)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** The contact links of "I'd love to work with you", as a stack of calling cards. */
export function callingCard(list: Element) {
  const items = parseLinks(list);
  return items && <ContactStack links={items} />;
}

/** What each contact card offers, and the colour of its mark. */
function contactStyle(l: LinkItem) {
  if (l.href.startsWith("mailto:")) return { cta: "Write to me", accent: "#23d18b" };
  if (/linkedin\.com/.test(l.href)) return { cta: "Connect", accent: "#4c9be8" };
  if (/github\.com/.test(l.href)) return { cta: "See the code", accent: "#f2f2f2" };
  if (/behance\.net|dribbble\.com|figma\.com/.test(l.href)) return { cta: "See the designs", accent: "#6b8cff" };
  if (l.target.type === "chat") return { cta: "Start a chat", accent: "#d97757" };
  return { cta: "Open", accent: "#f2f2f2" };
}

/**
 * A stack of simple black cards, one per way to reach me, layered like a wallet: the front card is
 * whole (the address, a line about it, and who it reaches) and opens the link; the ones behind show
 * their header strips, and picking one slides that card to the front. The first link (email) starts
 * at the front.
 */
function ContactStack({ links }: { links: LinkItem[] }) {
  // Back to front: the rest in order, then the first.
  const [order, setOrder] = useState(() => [...links.slice(1).map((_, i) => i + 1), 0]);
  const frontLink = useRef<HTMLAnchorElement>(null);
  const bringToFront = (i: number, fromKeyboard: boolean) => {
    setOrder((o) => [...o.filter((j) => j !== i), i]);
    // The strip's button goes away with the move: keep the keyboard on the card it brought forward.
    if (fromKeyboard) requestAnimationFrame(() => frontLink.current?.focus());
  };

  return (
    <div className="md-callcard-scene">
      <ul className="md-stack" aria-label="Ways to reach me" style={{ "--count": links.length } as CSSProperties}>
        {links.map((l, i) => {
          const p = order.indexOf(i);
          const front = p === links.length - 1;
          const { cta, accent } = contactStyle(l);
          // Printed the way business cards do: the LinkedIn mark already names the site.
          const handle = l.target.type === "chat" ? `${assistant.name}, my AI assistant` : cardPath(l.target).replace(/^linkedin\.com\//, "");
          return (
            <li key={l.href} className={front ? "is-front" : undefined} style={{ "--p": p, "--accent": accent } as CSSProperties}>
              <a
                ref={front ? frontLink : undefined}
                href={l.href}
                className="md-contact"
                inert={!front}
                aria-label={`${l.title}: ${handle}`}
                target={isWeb(l.href) ? "_blank" : undefined}
                rel={isWeb(l.href) ? "noopener noreferrer" : undefined}
                onClick={(e) => openInEditor(e, l.href)}
              >
                <span className="md-contact-band">
                  <span className="md-contact-icon">
                    <CardIcon target={l.target} />
                  </span>
                  <span className="md-contact-title">{l.title}</span>
                  {front && profile.openToWork ? (
                    <span className="md-contact-status">Open to work</span>
                  ) : (
                    <span className="md-contact-peek">{handle}</span>
                  )}
                </span>
                <span className="md-contact-body">
                  <span className="md-contact-handle">{handle}</span>
                  {l.description && <span className="md-contact-desc">{l.description}</span>}
                </span>
                <span className="md-contact-foot">
                  <PixelLogo className="md-contact-logo" />
                  <span className="md-contact-who">
                    <b>{profile.name}</b>
                    <span>
                      {profile.role} · {profile.location.split(",")[0]}
                    </span>
                  </span>
                  <span className="md-contact-cta">
                    {cta} <span aria-hidden>→</span>
                  </span>
                </span>
              </a>
              {!front && (
                <button
                  type="button"
                  className="md-contact-pick"
                  aria-label={`Show the ${l.title} card`}
                  onClick={(e) => bringToFront(i, e.detail === 0)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
