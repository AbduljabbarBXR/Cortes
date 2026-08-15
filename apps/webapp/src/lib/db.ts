import type { ProviderId } from "./models";

export interface StoredMsg {
  role: "user" | "assistant";
  content: string;
  thinking: string;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  providerId: ProviderId;
  model: string;
  createdAt: number;
  updatedAt: number;
  messages: StoredMsg[];
}

/**
 * Storage backend switch point. `local` persists to localStorage today.
 * Swapping to Supabase later means reimplementing these six functions
 * against the database and flipping DB_BACKEND. Nothing else changes.
 */
export const DB_BACKEND = "local" as const;

const KEY = "cortes.conversations.v1";

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function newConversation(providerId: ProviderId, model: string): Conversation {
  const now = Date.now();
  return {
    id: newId(),
    title: "New chat",
    providerId,
    model,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function listConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, Conversation>;
    return Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function loadConversation(id: string): Conversation | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, Conversation>;
    return all[id] ?? null;
  } catch {
    return null;
  }
}

export function saveConversation(c: Conversation): void {
  try {
    const raw = localStorage.getItem(KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, Conversation>) : {};
    all[c.id] = c;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage full or unavailable, ignore
  }
}

export function deleteConversation(id: string): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, Conversation>;
    delete all[id];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}
