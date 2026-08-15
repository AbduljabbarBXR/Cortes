export type ProviderId = "deepseek" | "openrouter" | "custom";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  hint?: string;
}

const env = import.meta.env;

export const PROVIDER_PRESETS: Record<ProviderId, ProviderConfig> = {
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiKey: env.VITE_DEEPSEEK_API_KEY ?? "",
    model: "deepseek-chat",
    hint: "deepseek-chat (fast) or deepseek-reasoner (thinking)",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: env.VITE_OPENROUTER_API_KEY ?? "",
    model: env.VITE_OPENROUTER_MODEL ?? "openai/gpt-oss-20b:free",
    hint: "Free trial models use the :free suffix. One key covers hundreds of models",
  },
  custom: {
    id: "custom",
    label: "Custom",
    baseUrl: "",
    apiKey: "",
    model: "",
    hint: "Point at any OpenAI compatible /chat/completions endpoint",
  },
};

export const PROVIDER_IDS: ProviderId[] = ["deepseek", "openrouter", "custom"];

/**
 * Sniffs the provider from an API key prefix. Returns the provider id to
 * activate plus the fields to fill. null means the key format is unknown.
 */
export function detectProvider(key: string): {
  id: ProviderId;
  baseUrl: string;
  model: string;
} | null {
  const k = key.trim();
  if (k.startsWith("sk-or-")) {
    return { id: "openrouter", baseUrl: PROVIDER_PRESETS.openrouter.baseUrl, model: "openai/gpt-oss-20b:free" };
  }
  if (k.startsWith("AIza")) {
    return {
      id: "custom",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-2.5-flash",
    };
  }
  if (k.startsWith("gsk_")) {
    return { id: "custom", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" };
  }
  if (k.startsWith("sk-")) {
    return { id: "deepseek", baseUrl: PROVIDER_PRESETS.deepseek.baseUrl, model: "deepseek-chat" };
  }
  return null;
}

/** Fetches the model id list from any OpenAI compatible /models endpoint. */
export async function fetchModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/+$/, "")}/models`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: failed to list models`);
  const json = (await res.json()) as { data?: { id: string }[] };
  return (json.data ?? []).map((m) => m.id).filter(Boolean);
}

/** Live OpenRouter credit balance, shown in the token viewer. */
export async function fetchCredits(apiKey: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/credits", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: failed to fetch credits`);
  const json = (await res.json()) as { data?: { total_credits?: number; usage?: number } };
  const total = json.data?.total_credits ?? 0;
  const used = json.data?.usage ?? 0;
  const left = total - used;
  return `$${left.toFixed(2)}`;
}

/** Rough token estimate when a provider does not report usage. */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
