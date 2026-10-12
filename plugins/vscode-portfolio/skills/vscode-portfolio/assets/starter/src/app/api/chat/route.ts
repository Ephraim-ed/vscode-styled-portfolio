import Anthropic from "@anthropic-ai/sdk";

import { assistant, features, profile } from "@/data/profile";
import { CHAT_MODEL } from "@/lib/chat-config";
import { chatSystemPrompt } from "@/lib/chat-knowledge";

/**
 * The chat assistant (`assistant` in src/data/profile.ts) — answers visitors' questions from the
 * profile (src/lib/chat-knowledge.ts). Off (404) unless features.chat.
 *
 * Streams newline-delimited JSON events to the client:
 *   {"type":"text","text":"…"}   answer text as it's generated
 *   {"type":"done"}              finished normally
 *   {"type":"error","message":"…"}
 *
 * Needs ANTHROPIC_API_KEY (in .env.local for development, and in the host's environment in production).
 */

export const runtime = "nodejs";
export const maxDuration = 60;

// Public endpoint: cap each answer's spend. Answers are a few sentences (Haiku 4.5 doesn't think
// unless asked, so all of this is answer text), which makes 1024 generous.
const MAX_TOKENS = 1024;
const MAX_HISTORY = 12; // messages sent to the model (6 exchanges)
const MAX_USER_CHARS = 1000;
const MAX_ASSISTANT_CHARS = 8000;
// Best-effort per-IP limit. It lives in this server instance's memory, so on serverless hosts each
// instance counts separately — set a spend limit on the Anthropic workspace as the real backstop.
const RATE_LIMIT = { requests: 20, windowMs: 10 * 60 * 1000 };

const hits = new Map<string, number[]>();

function rateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, times] of hits) if (times.every((t) => now - t >= RATE_LIMIT.windowMs)) hits.delete(k);
  }
  return recent.length > RATE_LIMIT.requests;
}

function parseMessages(body: unknown): Anthropic.MessageParam[] | string {
  const raw = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(raw) || raw.length === 0) return "Send at least one message.";
  const messages: Anthropic.MessageParam[] = [];
  for (const m of raw.slice(-MAX_HISTORY)) {
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim()) {
      return "Each message needs a role (user or assistant) and some text.";
    }
    const limit = role === "user" ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS;
    if (content.length > limit) return `Messages are limited to ${limit} characters.`;
    messages.push({ role, content });
  }
  // The trimmed history must start with a question and end with the new one.
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return "The last message must be a question.";
  return messages;
}

const json = (status: number, message: string) =>
  Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!features.chat) return json(404, "The chat is turned off on this site.");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return json(429, "You've asked a lot of questions in a short time — please try again in a few minutes.");

  const messages = parseMessages(await request.json().catch(() => null));
  if (typeof messages === "string") return json(400, messages);

  let client: Anthropic;
  try {
    client = new Anthropic();
  } catch {
    return json(503, "The chat isn't configured yet (missing ANTHROPIC_API_KEY).");
  }

  // No prompt caching: Haiku 4.5 only caches prompts of 4096+ tokens and the profile is about 2K,
  // so a cache marker would silently do nothing. Uncached, it's still ~$0.002 per question.
  const stream = client.messages.stream(
    {
      model: CHAT_MODEL,
      max_tokens: MAX_TOKENS,
      system: chatSystemPrompt,
      messages,
    },
    { signal: request.signal },
  );

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, event: object) =>
    controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send(controller, { type: "text", text: event.delta.text });
          }
        }
        const final = await stream.finalMessage();
        if (process.env.NODE_ENV === "development") {
          const u = final.usage;
          console.log(
            `[${assistant.name.toLowerCase()}] ${final.model} in=${u.input_tokens} cache_read=${u.cache_read_input_tokens ?? 0} ` +
              `cache_write=${u.cache_creation_input_tokens ?? 0} out=${u.output_tokens} stop=${final.stop_reason}`,
          );
        }
        if (final.stop_reason === "refusal") {
          send(controller, {
            type: "text",
            text: `\n\nI can't help with that one — try asking about ${profile.firstName}'s experience, projects or skills.`,
          });
        } else if (final.stop_reason === "max_tokens") {
          send(controller, { type: "text", text: "…" });
        }
        send(controller, { type: "done" });
      } catch (error) {
        if (request.signal.aborted) return;
        send(controller, { type: "error", message: describe(error) });
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function describe(error: unknown) {
  if (error instanceof Anthropic.AuthenticationError) return "The chat isn't configured correctly (invalid API key).";
  if (error instanceof Anthropic.PermissionDeniedError) return "The chat's API key doesn't have access to this model.";
  if (error instanceof Anthropic.RateLimitError) return "The chat is busy right now — please try again in a moment.";
  if (error instanceof Anthropic.APIConnectionError) return "Couldn't reach the AI service — please try again.";
  if (error instanceof Anthropic.APIError) return `The AI service returned an error (${error.status ?? "unknown"}). Please try again.`;
  if (error instanceof Anthropic.AnthropicError) return "The chat isn't configured yet (missing ANTHROPIC_API_KEY).";
  return "Something went wrong. Please try again.";
}
