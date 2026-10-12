"use client";

import { create } from "zustand";

import { features, profile } from "@/data/profile";
import { RAIN_AT, SHUTDOWN_AT, SNOW_AT, useWeather } from "@/lib/weather";

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done" | "error";
  error?: string;
  /** Answered in the browser (slash commands); never sent to the model. */
  local?: boolean;
  /** The assistant letting the visitor in on the README's weather secret (local too). */
  whisper?: boolean;
};

type ChatState = {
  messages: ChatMessage[];
  busy: boolean;
  /** Asks a question and streams the answer into the conversation. */
  send: (question: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
  retry: () => void;
  /** Adds a question/answer pair handled in the browser, e.g. `/help`. */
  addLocal: (question: string, answer: string) => void;
  /** Answers the start page's "Want me to tell you a secret?" with the README's secret. */
  tellSecret: () => void;
};

export const MAX_QUESTION_CHARS = 1000;

// Now and then, after an answer, the assistant leans in with the README's secret: high fives with
// the greeting's waving hand change the weather (lib/weather.ts). Written here, not by the model, so
// it costs nothing and stays exact; at most twice a chat, and never on consecutive answers. Only
// with features.easterEggs, since the secret is one of them.
const WHISPER_CHANCE = 0.3;
const MAX_WHISPERS = 2;
const WHISPER_DELAY_MS = 900;
const README = "[README.md](./README.md)";
const SECRETS = [
  `Psst… don't tell ${profile.firstName} I told you: give the waving hand at the top of ${README} five high fives, then watch the sky.`,
  `Psst… a secret: five high fives with the waving hand in ${README} make it rain. Ten bring winter.`,
  `Psst… the waving hand in ${README} loves high fives. Give it five. Then five more.`,
];

/** What the assistant whispers, given how many high fives have happened so far. */
function secretFor(highFives: number): string | null {
  if (highFives >= SHUTDOWN_AT) return null;
  if (highFives >= SNOW_AT) {
    return `Psst… it's snowing. ${SHUTDOWN_AT - highFives} more high fives and… actually, maybe don't. I can't be held responsible.`;
  }
  const more = (n: number) => `${n} more high five${n === 1 ? "" : "s"}`;
  if (highFives >= RAIN_AT) return `Psst… you found the rain. ${more(SNOW_AT - highFives)} with the waving hand and it turns to winter.`;
  if (highFives > 0) return `Psst… ${more(RAIN_AT - highFives)} with the waving hand in ${README} and see what happens to the sky.`;
  return SECRETS[Math.floor(Math.random() * SECRETS.length)];
}

let nextId = 1;
let controller: AbortController | null = null;
let whisperTimer: ReturnType<typeof setTimeout> | undefined;

/** Conversation with the assistant. Lives outside the component so it survives closing the panel. */
export const useChat = create<ChatState>()((set, get) => {
  const update = (id: number, patch: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>)) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) } : m)),
    }));

  const maybeWhisper = () => {
    if (!features.easterEggs) return;
    const { messages } = get();
    const last = messages.findLastIndex((m) => m.whisper);
    const answersSince = messages.slice(last + 1).filter((m) => m.role === "assistant" && !m.local).length;
    if (messages.filter((m) => m.whisper).length >= MAX_WHISPERS) return;
    if (last >= 0 && answersSince < 2) return;
    if (Math.random() >= WHISPER_CHANCE) return;
    const secret = secretFor(useWeather.getState().highFives);
    if (!secret) return;
    whisperTimer = setTimeout(() => {
      if (get().busy) return;
      set((s) => ({
        messages: [
          ...s.messages,
          { id: nextId++, role: "assistant", content: secret, status: "done", local: true, whisper: true },
        ],
      }));
    }, WHISPER_DELAY_MS);
  };

  return {
    messages: [],
    busy: false,

    send: async (question) => {
      const text = question.trim().slice(0, MAX_QUESTION_CHARS);
      if (!text || get().busy) return;
      clearTimeout(whisperTimer);

      // Only completed exchanges go back to the model as history.
      const history = get()
        .messages.filter((m) => m.status === "done" && !m.local)
        .map(({ role, content }) => ({ role, content }));
      const user: ChatMessage = { id: nextId++, role: "user", content: text, status: "done" };
      const reply: ChatMessage = { id: nextId++, role: "assistant", content: "", status: "streaming" };
      set((s) => ({ messages: [...s.messages, user, reply], busy: true }));

      controller = new AbortController();
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [...history, { role: "user", content: text }] }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffered = "";
        let finished = false;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffered += decoder.decode(value, { stream: true });
          const lines = buffered.split("\n");
          buffered = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as { type: string; text?: string; message?: string };
            if (event.type === "text" && event.text) update(reply.id, (m) => ({ content: m.content + event.text }));
            else if (event.type === "error") throw new Error(event.message);
            else if (event.type === "done") finished = true;
          }
        }
        if (!finished) throw new Error("The answer was cut off. Please try again.");
        update(reply.id, { status: "done" });
        maybeWhisper();
      } catch (error) {
        if (controller?.signal.aborted) {
          // Stopped by the visitor: keep whatever arrived.
          update(reply.id, (m) => ({ status: m.content ? "done" : "error", error: m.content ? undefined : "Stopped." }));
        } else {
          update(reply.id, { status: "error", error: error instanceof Error ? error.message : "Something went wrong." });
        }
      } finally {
        controller = null;
        set({ busy: false });
      }
    },

    stop: () => {
      controller?.abort();
    },

    addLocal: (question, answer) =>
      set((s) => ({
        messages: [
          ...s.messages,
          { id: nextId++, role: "user", content: question, status: "done", local: true },
          { id: nextId++, role: "assistant", content: answer, status: "done", local: true },
        ],
      })),

    tellSecret: () => {
      if (get().busy) return;
      clearTimeout(whisperTimer);
      const highFives = useWeather.getState().highFives;
      const secret =
        secretFor(highFives) ?? `You found it already: it's snowing in ${README}. That's every secret I've got.`;
      set((s) => ({
        messages: [
          ...s.messages,
          { id: nextId++, role: "user", content: "Yes, tell me the secret!", status: "done", local: true },
          { id: nextId++, role: "assistant", content: secret, status: "done", local: true, whisper: true },
        ],
      }));
    },

    reset: () => {
      controller?.abort();
      clearTimeout(whisperTimer);
      set({ messages: [], busy: false });
    },

    retry: () => {
      const { messages, busy } = get();
      if (busy) return;
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (!lastUser) return;
      // Drop the failed exchange and ask again.
      set({ messages: messages.filter((m) => m.id < lastUser.id) });
      void get().send(lastUser.content);
    },
  };
});
