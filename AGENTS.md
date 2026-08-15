# Cortes — Agent Instructions

Cortes is a mobile first coding platform that teaches as it codes. Forked from Hermes Agent (Nous Research, MIT). The user is AbduljabbarBXR. We build together: I write, the user tests, they report, we fix. **Never push to origin without explicit approval.**

## Working agreements

- Advice first, edits after approval.
- One change class per round.
- Never push without sign-off. Local commits are fine.
- Always end with a test handoff: exact steps and expected results.
- Report GREEN (all verified) or RED (what remains) at the end of each batch.
- Load the skills: `team-protocol` (workflow), `cortes-app` (project bible), `safe-code-architect` (pre edit protocol).

## Repo map

- `apps/webapp/` — active product. Vite + React on port 3000. Tested in browser.
- `apps/mobile/` — Expo 57 shell, built on a PC.
- `apps/webapp/src/lib/` and `apps/mobile/lib/` — parallel logic, keep in sync.
- `hermes_cli/`, `agent/`, `gateway/`, `tools/`, `skills/` — upstream agent core. Do not modify.
- `scripts/build-hermesc-arm64.sh` — on device hermesc builder.

## Non-negotiable conventions

- **No dashes in UI text** (hyphen, en dash, em dash). Use colons, periods, words.
- **Web only flows.** No mobile app build types or pre prompts.
- One source of truth per concept. The Conversation holds providerId + model; pickers sync to it.
- Provider keys in `lib/storage.ts`, conversations in `lib/db.ts` (Supabase swap point).
- Commit identity: `AbduljabbarBXR <AbduljabbarBXR@users.noreply.github.com>`.

## Toolchain on this device

- Use `/usr/local/bin/npm` and `/usr/local/bin/npx` (glibc). The apt npm and Termux npx are broken.
- `node` resolves to /usr/bin/node v22.22.1 in proot shells.
- Keep the Vite dev server running for the user: `nohup /usr/local/bin/npm run dev` in apps/webapp.
- tsc needs a capped heap on this phone: `node --max-old-space-size=896 node_modules/typescript/bin/tsc --noEmit`.

## Verification before handing back

1. Typecheck (commands above).
2. Curl each changed module through the running dev server, expect 200.
3. Grep for dashes in any new UI strings.
4. State the test handoff.

## Full context

Read `cortes-app` skill for the state architecture, key files, and provider facts. Read `team-protocol` for the handoff format and green or red reporting.
