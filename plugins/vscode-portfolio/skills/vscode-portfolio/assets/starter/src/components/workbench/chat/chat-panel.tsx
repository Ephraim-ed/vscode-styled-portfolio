"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { VscAdd, VscArrowUp, VscClose, VscDebugStop } from "react-icons/vsc";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { assistantBanner, assistantBannerLabel } from "@/data/assistant-banner";
import { assistant, experience, features, profile, projects } from "@/data/profile";
import { composeEmail } from "@/lib/actions";
import { CHAT_MODEL } from "@/lib/chat-config";
import { MAX_QUESTION_CHARS, useChat, type ChatMessage } from "@/lib/chat-store";
import { markdownUrlTransform } from "@/lib/markdown";
import { navigateHref } from "@/lib/navigation";
import { useWorkbench } from "@/lib/store";
import { cn } from "@/lib/utils";

const MIN_WIDTH = 300;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 380;

const { firstName } = profile;
const { object: them, possessive: their } = profile.pronouns;
const label = `${assistant.name} ${assistant.title}`;

const SUGGESTIONS = [
  experience[0] ? `What does ${firstName} do at ${experience[0].company}?` : `What does ${firstName} do?`,
  `What's ${their} strongest tech stack?`,
  projects[0] ? `Tell me about ${projects[0].name}` : `What has ${firstName} built?`,
  `How can I contact ${them}?`,
];

const HELP = `I'm **${assistant.name}**, ${firstName}'s personal assistant. I answer questions about ${them} from ${their} resume, using Claude.

- Ask about ${their} experience, projects, skills or education
- \`/clear\` starts a new conversation
- \`/email\` opens an email to ${them}
- ↑ in an empty box recalls your last question`;

/** Claude Code's spinner glyphs (the ones without emoji presentation). */
const SPINNER = ["·", "✢", "✶", "✻", "✽", "✻", "✶", "✢"];
const VERBS = ["Thinking", "Pondering", "Reading the resume", "Recalling"];

function Spinner() {
  const [frame, setFrame] = useState(0);
  const [verb] = useState(() => VERBS[Math.floor(Math.random() * VERBS.length)]);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), 120);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="flex items-center gap-2 text-claude">
      <span aria-hidden className="inline-block w-3 text-center">
        {SPINNER[frame % SPINNER.length]}
      </span>
      {verb}…
    </span>
  );
}

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={markdownUrlTransform}
      components={{
        a: ({ href = "", children: label }) => (
          <a
            href={href}
            target={/^https?:/.test(href) ? "_blank" : undefined}
            rel={/^https?:/.test(href) ? "noopener noreferrer" : undefined}
            onClick={(e) => {
              if (/^https?:/.test(href)) return;
              e.preventDefault();
              navigateHref(href);
            }}
          >
            {label}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

const markdownClass = [
  "min-w-0 flex-1 break-words",
  "[&_p]:my-1.5 first:[&_p]:mt-0 last:[&_p]:mb-0",
  "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5",
  "[&_a]:text-link [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80",
  "[&_code]:rounded-[3px] [&_code]:bg-list-hover [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.92em]",
  "[&_strong]:font-semibold [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold",
].join(" ");

function Message({ message, last }: { message: ChatMessage; last: boolean }) {
  const retry = useChat((s) => s.retry);
  if (message.role === "user") {
    return (
      <div className="rounded-md border border-line bg-list-hover/50 px-3 py-2 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">
        <span aria-hidden className="text-description select-none">
          &gt;{" "}
        </span>
        {message.content}
      </div>
    );
  }
  if (message.whisper) {
    return (
      <div className="flex gap-2 text-[12.5px] leading-relaxed text-description italic">
        <span aria-hidden className="mt-px text-claude select-none">
          ✻
        </span>
        <div className={markdownClass}>
          <Markdown>{message.content}</Markdown>
        </div>
      </div>
    );
  }
  const streaming = message.status === "streaming";
  return (
    <div className="flex gap-2 text-[13px] leading-relaxed">
      <span
        aria-hidden
        className={cn("mt-[3px] text-[10px] select-none", streaming ? "text-claude" : "text-side-foreground/70")}
      >
        ●
      </span>
      <div className="min-w-0 flex-1">
        {streaming && !message.content && <Spinner />}
        {message.content && (
          <div className={markdownClass}>
            <Markdown>{message.content}</Markdown>
          </div>
        )}
        {streaming && message.content && (
          <span aria-hidden className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-claude align-text-bottom" />
        )}
        {message.status === "error" && (
          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-ansi-red">
            <span>⎿ {message.error}</span>
            {last && (
              <button type="button" onClick={retry} className="rounded-sm border border-current px-1.5 hover:bg-ansi-red/10">
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** A speech bubble under the banner: the assistant offering the README's secret (features.easterEggs). Clicking it tells it. */
function SecretBubble() {
  const tellSecret = useChat((s) => s.tellSecret);
  return (
    <button type="button" onClick={tellSecret} className="chat-bubble">
      Want me to tell you a secret?
    </button>
  );
}

function StartPage() {
  const send = useChat((s) => s.send);
  const cols = Math.max(...assistantBanner.map((l) => l.length));
  // Fills the transcript's height so the suggestions sit at the bottom, just above the input box.
  return (
    <div className="flex min-h-full flex-col gap-4 px-4 pt-4 pb-2">
      <div className="[container-type:inline-size]">
        <pre
          aria-label={assistantBannerLabel}
          role="img"
          className="mx-auto w-fit font-mono leading-[1.05] font-bold text-claude select-none [font-variant-ligatures:none]"
          style={{ fontSize: `min(9px, calc(100cqw / ${cols * 0.6}))` } as CSSProperties}
        >
          {assistantBanner.join("\n")}
        </pre>
      </div>

      {features.easterEggs && <SecretBubble />}

      <div className="rounded-md border border-claude/60 px-3 py-2.5 text-[12.5px] leading-relaxed">
        <p className="font-semibold">
          <span className="text-claude">✻</span> Hi, I&apos;m {assistant.name}, {firstName}&apos;s personal assistant.
        </p>
        <p className="mt-1 text-description">
          Ask me about {their} experience, projects, skills, or how to reach {them}. I&apos;m an AI that answers from {their}{" "}
          resume, so I can get things wrong — for anything important, email {them}.
        </p>
        <p className="mt-2 font-mono text-[11.5px] text-description">/help for tips · /clear to start over</p>
      </div>

      <div className="mt-auto">
        <p className="mb-1.5 text-[11px] font-bold tracking-wide text-side-title uppercase">Try asking</p>
        <ul className="flex flex-col gap-1">
          {SUGGESTIONS.map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => void send(q)}
                className="w-full rounded-md px-2 py-1.5 text-left font-mono text-[12px] text-side-foreground/90 hover:bg-list-hover"
              >
                <span aria-hidden className="text-claude">
                  &gt;{" "}
                </span>
                {q}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Composer() {
  const send = useChat((s) => s.send);
  const stop = useChat((s) => s.stop);
  const reset = useChat((s) => s.reset);
  const addLocal = useChat((s) => s.addLocal);
  const busy = useChat((s) => s.busy);
  const lastQuestion = useChat((s) => [...s.messages].reverse().find((m) => m.role === "user" && !m.local)?.content);
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  // Grow with the text, up to ~8 lines. Empty, it keeps its natural one-row height: measuring while
  // the panel is hidden (it mounts hidden on narrow screens) would collapse it to 0px.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "";
    if (text) el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const submit = () => {
    const q = text.trim();
    if (!q || busy) return;
    setText("");
    if (q.startsWith("/")) {
      const command = q.slice(1).split(/\s+/)[0].toLowerCase();
      if (command === "clear" || command === "new") reset();
      else if (command === "email" || command === "contact") composeEmail();
      else if (command === "help") addLocal(q, HELP);
      else addLocal(q, `Unknown command \`${q}\`. Try \`/help\`.`);
      return;
    }
    void send(q);
  };

  return (
    <div className="shrink-0 px-3 pt-1 pb-2">
      <div className="rounded-lg border border-field-border bg-field transition-colors focus-within:border-claude/80">
        <label htmlFor="chat-input" className="sr-only">
          Ask {assistant.name} a question about {firstName}
        </label>
        <textarea
          id="chat-input"
          ref={ref}
          rows={1}
          value={text}
          maxLength={MAX_QUESTION_CHARS}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            } else if (e.key === "ArrowUp" && !text && lastQuestion) {
              e.preventDefault();
              setText(lastQuestion);
            } else if (e.key === "Escape" && busy) {
              stop();
            }
          }}
          placeholder={`Ask ${assistant.name} anything about ${firstName}…`}
          className="block max-h-40 w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-[13px] leading-relaxed text-field-foreground outline-none placeholder:text-placeholder"
        />
        <div className="flex items-center gap-2 px-2 pb-1.5">
          <span className="truncate font-mono text-[10.5px] text-description max-sm:hidden">⏎ send · ⇧⏎ new line</span>
          <span className="ml-auto shrink-0 font-mono text-[10.5px] text-description">{CHAT_MODEL}</span>
          {busy ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop"
              title="Stop (Esc)"
              className="grid size-6 shrink-0 place-items-center rounded-md bg-side-foreground/15 hover:bg-side-foreground/25"
            >
              <VscDebugStop className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim()}
              aria-label="Send"
              className="grid size-6 shrink-0 place-items-center rounded-md bg-claude text-white transition-opacity disabled:opacity-35"
            >
              <VscArrowUp className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[10.5px] text-description">{assistant.name} is an AI answering from {firstName}&apos;s resume, so it can be wrong.</p>
    </div>
  );
}

function Conversation() {
  const messages = useChat((s) => s.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const lastAnswer = [...messages].reverse().find((m) => m.role === "assistant" && m.status === "done")?.content ?? "";

  // Follow the answer as it streams, unless the visitor has scrolled up to read.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      }}
      className="vsc-scroll min-h-0 flex-1 overflow-y-auto"
    >
      {messages.length === 0 ? (
        <StartPage />
      ) : (
        <div className="flex flex-col gap-4 px-4 py-4">
          {messages.map((m, i) => (
            <Message key={m.id} message={m} last={i === messages.length - 1} />
          ))}
        </div>
      )}
      {/* Announce finished answers once, instead of every streamed fragment. */}
      <p className="sr-only" aria-live="polite">
        {lastAnswer}
      </p>
    </div>
  );
}

/** The chat assistant (features.chat): a Claude Code–style chat docked on the right (a slide-over below 1280px). */
export function ChatPanel() {
  return features.chat ? <ChatPanelInner /> : null;
}

function ChatPanelInner() {
  const chatOpen = useWorkbench((s) => s.chatOpen);
  const chatOverlayOpen = useWorkbench((s) => s.chatOverlayOpen);
  const closeChat = useWorkbench((s) => s.closeChat);
  const reset = useChat((s) => s.reset);
  const hasMessages = useChat((s) => s.messages.length > 0);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; width: number } | null>(null);

  return (
    <>
      {chatOverlayOpen && (
        <div aria-hidden onClick={closeChat} className="absolute inset-0 z-30 bg-black/40 xl:hidden" />
      )}
      <aside
        aria-label={`${label}, ${firstName}'s personal assistant`}
        style={{ "--chat-width": `${width}px` } as CSSProperties}
        onKeyDown={(e) => e.key === "Escape" && chatOverlayOpen && !useChat.getState().busy && closeChat()}
        className={cn(
          "relative shrink-0 flex-col border-l border-line bg-side text-side-foreground",
          "max-xl:absolute max-xl:inset-y-0 max-xl:right-0 max-xl:z-40 max-xl:w-[min(100%,420px)] max-xl:shadow-2xl",
          "xl:w-(--chat-width)",
          chatOverlayOpen ? "max-xl:flex" : "max-xl:hidden",
          chatOpen ? "xl:flex" : "xl:hidden",
        )}
      >
        <div className="flex h-[35px] shrink-0 items-center gap-2 pr-2 pl-4">
          <span aria-hidden className="text-sm text-claude">
            ✻
          </span>
          <h2 className="text-[12px] font-medium tracking-wide text-side-title">{label}</h2>
          <div className="ml-auto flex items-center gap-0.5">
            {hasMessages && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="New Chat"
                    onClick={reset}
                    className="grid size-6 place-items-center rounded-md hover:bg-list-hover"
                  >
                    <VscAdd className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">New Chat</TooltipContent>
              </Tooltip>
            )}
            <button
              type="button"
              aria-label={`Close ${assistant.name}`}
              title="Close"
              onClick={closeChat}
              className="grid size-6 place-items-center rounded-md hover:bg-list-hover"
            >
              <VscClose className="size-4" />
            </button>
          </div>
        </div>

        <Conversation />
        <Composer />

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, width };
            setDragging(true);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const next = drag.current.width - (e.clientX - drag.current.x);
            setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
          }}
          onPointerUp={() => {
            drag.current = null;
            setDragging(false);
          }}
          onPointerCancel={() => {
            drag.current = null;
            setDragging(false);
          }}
          onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
          className={cn(
            "absolute inset-y-0 -left-[3px] z-20 w-1.5 cursor-ew-resize touch-none transition-colors delay-150 hover:bg-focus max-xl:hidden",
            dragging && "bg-focus",
          )}
        />
      </aside>
    </>
  );
}
