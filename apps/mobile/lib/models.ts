export type ProviderId = "deepseek" | "hermes" | "openrouter" | "custom";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  hint?: string;
}

const env = process.env.EXPO_PUBLIC_;

export const PROVIDER_PRESETS: Record<ProviderId, ProviderConfig> = {
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiKey: env.EXPO_PUBLIC_DEEPSEEK_API_KEY ?? "",
    model: "deepseek-chat",
    hint: "deepseek-chat (fast) or deepseek-reasoner (thinking)",
  },
  hermes: {
    id: "hermes",
    label: "Hermes",
    baseUrl: env.EXPO_PUBLIC_HERMES_BASE_URL ?? "",
    apiKey: env.EXPO_PUBLIC_HERMES_API_KEY ?? "",
    model: env.EXPO_PUBLIC_HERMES_MODEL ?? "",
    hint: "Any OpenAI-compatible host: self-hosted vLLM, Together, your own box",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? "",
    model: env.EXPO_PUBLIC_OPENROUTER_MODEL ?? "deepseek/deepseek-r1:free",
    hint: "Free trial models use the :free suffix — one key covers hundreds of models",
  },
  custom: {
    id: "custom",
    label: "Custom",
    baseUrl: "",
    apiKey: "",
    model: "",
    hint: "Point at any OpenAI-compatible /chat/completions endpoint",
  },
};

export const PROVIDER_IDS: ProviderId[] = ["deepseek", "hermes", "openrouter", "custom"];
