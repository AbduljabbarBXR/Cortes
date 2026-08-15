export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamOptions {
  baseURL: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  onText: (delta: string) => void;
  onReasoning?: (delta: string) => void;
  onDone?: () => void;
  signal?: AbortSignal;
}

/**
 * Streaming chat against any OpenAI-compatible /chat/completions endpoint.
 * Handles DeepSeek-style `reasoning_content` (deepseek-reasoner) alongside
 * standard `delta.content`. Pure SSE over fetch — no SDK required.
 */
export async function streamChat(opts: StreamOptions): Promise<void> {
  const url = `${opts.baseURL.replace(/\/+$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300) || "request failed"}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Streaming not supported by this client");

  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta;
          if (!delta) continue;
          if (typeof delta.reasoning_content === "string" && delta.reasoning_content) {
            opts.onReasoning?.(delta.reasoning_content);
          }
          if (typeof delta.content === "string" && delta.content) {
            opts.onText(delta.content);
          }
        } catch {
          // skip malformed keep-alive frames
        }
      }
    }
  }

  opts.onDone?.();
}

/** Extracts a full HTML document from an assistant reply, if one was emitted. */
export function extractHtml(markdown: string): string | null {
  const match = markdown.match(/```(?:html)?\s*(<!DOCTYPE html>|<html[\s>]).*?<\/html>\s*```/is);
  if (match) return match[0].replace(/```(?:html)?\s*/is, "").replace(/\s*```\s*$/s, "");
  const bare = markdown.match(/(<!DOCTYPE html>|<html[\s>])[\s\S]*?<\/html>/i);
  return bare ? bare[0] : null;
}

export const PRE_PROMPTS = [
  "Build a website",
  "Build a backend API",
  "Teach me system design",
  "Scaffold an AI system",
];
