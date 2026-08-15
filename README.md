<p align="center">
  <img src="assets/banner.png" alt="Cortes Agent" width="100%">
</p>

# Cortes ☤

**The agent that grows with you. A mobile first coding platform built on [Hermes Agent](https://github.com/NousResearch/hermes-agent) by Nous Research.**

Cortes is the self improving AI agent forked from Hermes Agent. It creates skills from experience, improves them during use, searches its own past conversations, and builds a deepening model of who you are across sessions. It runs on a $5 VPS, a GPU cluster, or right on your phone under Termux, and talks to any model you want: DeepSeek, OpenRouter, Hermes, OpenAI, your own endpoint. No lock in.

The agent core is unchanged from upstream. This fork rebrands the product, strips the non core surface (contribution docs, marketing website, research runners, desktop app), and adds the mobile and web clients.

> **Attribution:** Cortes is MIT licensed and built on [Hermes Agent](https://github.com/NousResearch/hermes-agent) © 2025 Nous Research. See [LICENSE](LICENSE).

---

## Repo layout

| Path | What it is |
|---|---|
| `hermes_cli/` `agent/` `gateway/` `tools/` `skills/` `plugins/` | The agent core (upstream, unmodified) |
| `apps/mobile/` | The Cortes mobile app: Expo / React Native shell with chat, canvas preview panel, pre prompts, BYOK providers |
| `apps/webapp/` | The Cortes web app: same product as a Vite + React page, dev server on port 3000 |
| `web/` | Upstream dashboard UI (future home of the web app, behind auth) |
| `ui-tui/` | Terminal UI (TUI) |
| `scripts/build-hermesc-arm64.sh` | Build a native arm64 hermesc on device for fully on device release builds |
| `assets/` | Branding |

## The product

Cortes is a **mobile first coding platform that teaches as it codes**:

1. **Requirements phase.** You tell Cortes what you want to build. It interviews you about screens, stack, and scope before writing a line.
2. **Scaffold phase.** Cortes diagrams the system (ASCII), then writes tagged files step by step, explaining as it goes.
3. **Preview phase.** The built UI appears in a live panel above the chat. You touch what you built.
4. **Terminal phase.** Termux runs the real dev server. Cortes shows you the real logs, collapsible, so you understand what is running.
5. **Toggles.** Terminal view, code to UI mapping, and preview frames (phone, tablet, desktop).

### Model support (BYOK)

Bring your own key to any provider. Nothing is shipped in the app, keys live on your device.

| Provider | Default model | Notes |
|---|---|---|
| DeepSeek | `deepseek-chat` | Also `deepseek-reasoner` with live thinking display |
| Hermes | any | Point at any OpenAI compatible host (vLLM, Together, your own box) |
| OpenRouter | `deepseek/deepseek-r1:free` | Free `:free` models for trial |
| Custom | any | Any OpenAI compatible `/chat/completions` endpoint |

## Running the web app

```bash
cd apps/webapp
npm install
npm run dev        # serves on http://localhost:3000
```

## Running the mobile app

```bash
cd apps/mobile
npm install
npx expo start     # Expo Go on device
```

Release APK and debug builds run on a PC (or EAS cloud), not on the phone. See the build section below for why.

## The agent CLI (Termux first)

```bash
cortes              # Interactive CLI
cortes model        # Choose provider and model
cortes setup        # First time configuration
cortes gateway      # Messaging gateway (Telegram, Discord, and more)
cortes doctor       # Diagnose issues
```

## Building on device

The phone can build the app itself, but the Android toolchain Google ships has no arm64 host binaries (aapt2, cmake, and NDK host tools are x86_64 only). Two workarounds live in this repo:

1. `scripts/build-hermesc-arm64.sh` builds the Hermes bytecode compiler natively for arm64.
2. System level: aapt2 and cmake must be swapped for arm64 binaries (see the script and the commit history for the exact steps).

For normal development, build the APK on a PC: `cd apps/mobile && npx expo run:android` or EAS cloud.

## Documentation

Upstream docs apply to the agent core: **[hermes-agent.nousresearch.com/docs](https://hermes-agent.nousresearch.com/docs/)**.

## Roadmap

- [x] Fork, strip, rebrand to Cortes (MIT kept)
- [x] Mobile shell: chat + canvas preview + pre prompts + BYOK providers
- [x] Web shell: same product in the browser
- [ ] Requirements to scaffold tagged flow (diagram to code mapping)
- [ ] Real Termux terminal integration in the mobile app
- [ ] Offline tier (llama.rn, small models under 5B)
- [ ] Multi project list, moderation hook
- [ ] Web app behind auth in the dashboard

## License

MIT, see [LICENSE](LICENSE). Fork of [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) © 2025 Nous Research.
