import * as SecureStore from "expo-secure-store";

import { PROVIDER_PRESETS, type ProviderConfig, type ProviderId } from "./models";

const PROVIDERS_KEY = "cortes.providers.v1";
const ACTIVE_KEY = "cortes.active_provider.v1";

export async function loadProviders(): Promise<Record<ProviderId, ProviderConfig>> {
  try {
    const raw = await SecureStore.getItemAsync(PROVIDERS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Record<ProviderId, ProviderConfig>>;
      const merged = { ...PROVIDER_PRESETS };
      for (const id of Object.keys(PROVIDER_PRESETS) as ProviderId[]) {
        if (saved[id]) merged[id] = { ...PROVIDER_PRESETS[id], ...saved[id] };
      }
      return merged;
    }
  } catch {
    // fall through to presets
  }
  return { ...PROVIDER_PRESETS };
}

export async function saveProviders(
  providers: Record<ProviderId, ProviderConfig>
): Promise<void> {
  await SecureStore.setItemAsync(PROVIDERS_KEY, JSON.stringify(providers));
}

export async function loadActiveProvider(): Promise<ProviderId> {
  try {
    const raw = await SecureStore.getItemAsync(ACTIVE_KEY);
    if (raw && raw in PROVIDER_PRESETS) return raw as ProviderId;
  } catch {
    // fall through
  }
  return "deepseek";
}

export async function saveActiveProvider(id: ProviderId): Promise<void> {
  await SecureStore.setItemAsync(ACTIVE_KEY, id);
}
