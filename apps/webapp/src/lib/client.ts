export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface StreamOptions {
  baseURL: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  onText: (delta: string) => void;
  onReasoning?: (delta: string) => void;
  onUsage?: (usage: StreamUsage) => void;
  onDone?: () => void;
  signal?: AbortSignal;
}

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
      stream_options: { include_usage: true },
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
          if (typeof json.usage?.prompt_tokens === "number") {
            opts.onUsage?.({
              promptTokens: json.usage.prompt_tokens,
              completionTokens: json.usage.completion_tokens ?? 0,
            });
          }
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

export function extractHtml(markdown: string): string | null {
  const fence = markdown.match(
    /```(?:html)?\s*(<!DOCTYPE html>|<html[\s>])[\s\S]*?<\/html>\s*```/is
  );
  if (fence) return fence[0].replace(/```(?:html)?\s*/is, "").replace(/\s*```\s*$/s, "");
  const bare = markdown.match(/(<!DOCTYPE html>|<html[\s>])[\s\S]*?<\/html>/is);
  if (bare) return bare[0];
  const partial = markdown.match(/(<!DOCTYPE html>|<html[\s>])[\s\S]*$/is);
  if (partial) return partial[0] + "\n</body>\n</html>";
  const frag = markdown.match(/```(?:html)?\s*\n([\s\S]*?)(?:```|$)/is);
  if (frag && /<(?:head|body|main|div|h[1-6]|p|section|header|footer|ul|ol|table|nav|a|form)\b/i.test(frag[1])) {
    return `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n${frag[1].trim()}\n</body>\n</html>`;
  }
  return null;
}

export const PRE_PROMPTS = [
  "Build a website",
  "Build a backend API",
  "Teach me system design",
  "Scaffold an AI system",
];
