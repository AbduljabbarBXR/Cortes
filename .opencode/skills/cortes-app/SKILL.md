---
name: cortes-app
description: The Cortes project bible. Layout, conventions, commands, provider facts, and verification steps for the webapp and mobile app. Load before any work on apps/webapp or apps/mobile.
compatibility: opencode
license: MIT
---

# Cortes Project Bible

Cortes is a mobile first coding platform that teaches as it codes. Forked from Hermes Agent (Nous Research, MIT). The agent core (hermes_cli, agent, gateway, tools) is upstream and stays unmodified.

## Repo layout

| Path | Role |
|---|---|
| `apps/webapp/` | Active product. Vite + React, dev server on port 3000, tested in browser |
| `apps/mobile/` | Expo 57 / RN 0.86 shell. Built on a PC, not on device |
| `apps/mobile/lib/` `apps/webapp/src/lib/` | Parallel logic, kept in sync by hand |
| `scripts/build-hermesc-arm64.sh` | On device arm64 hermesc builder (niche) |
| `hermes_cli/` `agent/` etc | Upstream agent core, do not touch |

## Key files (webapp)

- `src/App.tsx` — layout modes (fullscreen canvas + mini chatbox, chat view), conversations, usage tracking
- `src/lib/client.ts` — SSE streaming, extractHtml, pre prompts
- `src/lib/build.ts` — requirements brief, tagged output contract, diagram/code parsers
- `src/lib/db.ts` — conversation store. DB_BACKEND flag is the Supabase swap point
- `src/lib/models.ts` — provider presets, key auto detect, fetchModels, fetchCredits, token helpers
- `src/lib/storage.ts` — provider keys (localStorage now)
- `src/lib/toasts.tsx` — toast system + API error mapping
- `src/Settings.tsx` — provider tabs, quick add, model picker, balance
- `src/Requirements.tsx` — build brief form
- `src/ModelPicker.tsx` — searchable model dropdown

## State architecture (single source of truth)

- A Conversation (lib/db.ts) holds `providerId + model`. That is the ONLY place the active model lives.
- Chat header picker writes convo.model AND syncs the provider default (saveProviders).
- Settings save writes provider default AND applies to current chat via onModelSynced.
- New chats inherit the provider default. Empty models are migrated on open.
- Provider keys live in lib/storage.ts, conversation data in lib/db.ts.

## Conventions

- **No dashes in UI text** (hyphen, en dash, em dash). Use colons, periods, or words.
- **Web only flows**: no mobile app build types or pre prompts.
- User identity for commits: `AbduljabbarBXR <AbduljabbarBXR@users.noreply.github.com>`.
- NEVER push to origin without the user's explicit approval. Local commits are fine.

## Verification commands

```bash
# webapp typecheck (phone memory is tight, cap the heap)
cd apps/webapp && node --max-old-space-size=896 node_modules/typescript/bin/tsc --noEmit

# mobile typecheck
cd apps/mobile && /usr/local/bin/npx tsc --noEmit

# module transform check (vite dev server must be running on 3000)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/src/App.tsx   # expect 200

# dash scan on UI strings
grep -rn "—\|–" apps/webapp/src apps/mobile/app apps/mobile/lib
```

## Toolchain quirks on this device

- Use `/usr/local/bin/npm` and `/usr/local/bin/npx` (glibc), never the broken apt npm or Termux npx.
- `node` in a proot shell resolves to /usr/bin/node (v22.22.1). Use it for webapp work.
- Vite dev server on 3000 must stay running for the user to test; restart with `nohup /usr/local/bin/npm run dev`.
- tsc hangs when memory is tight; cap heap and retry.

## Provider facts

- OpenRouter free models change over time; verify against https://openrouter.ai/api/v1/models before hardcoding a `:free` slug.
- Keys: `sk-or-` OpenRouter, `AIza` Gemini, `gsk_` Groq, `sk-` DeepSeek (see detectProvider).
- DeepSeek reasoner streams `reasoning_content`; the client surfaces it as a thinking block.
- Error mapping lives in src/lib/toasts.tsx (401, 402, 403, 404, 429, 5xx).
