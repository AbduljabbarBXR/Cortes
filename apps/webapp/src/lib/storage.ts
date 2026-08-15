import { PROVIDER_PRESETS, type ProviderConfig, type ProviderId } from "./models";

const PROVIDERS_KEY = "cortes.providers.v1";
const ACTIVE_KEY = "cortes.active_provider.v1";

export function loadProviders(): Record<ProviderId, ProviderConfig> {
  try {
    const raw = localStorage.getItem(PROVIDERS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Record<ProviderId, ProviderConfig>>;
      const merged = { ...PROVIDER_PRESETS };
      for (const id of Object.keys(PROVIDER_PRESETS) as ProviderId[]) {
        if (saved[id]) {
          const s = { ...PROVIDER_PRESETS[id], ...saved[id] };
          if (!s.model) s.model = PROVIDER_PRESETS[id].model;
          merged[id] = s;
        }
      }
      return merged;
    }
  } catch {
    // fall through to presets
  }
  return { ...PROVIDER_PRESETS };
}

export function saveProviders(providers: Record<ProviderId, ProviderConfig>): void {
  localStorage.setItem(PROVIDERS_KEY, JSON.stringify(providers));
}

export function loadActiveProvider(): ProviderId {
  const raw = localStorage.getItem(ACTIVE_KEY);
  if (raw && raw in PROVIDER_PRESETS) return raw as ProviderId;
  return "deepseek";
}

export function saveActiveProvider(id: ProviderId): void {
  localStorage.setItem(ACTIVE_KEY, id);
}
