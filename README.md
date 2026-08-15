<p align="center">
  <img src="assets/banner.png" alt="Cortes Agent" width="100%">
</p>

# Cortes ☤

**The agent that grows with you. A mobile first coding platform built on [Hermes Agent](https://github.com/NousResearch/hermes-agent) by Nous Research.**

Cortes is a self improving AI coding agent forked from Hermes Agent. It builds with you, teaches as it codes, and shows you every line as it is written. It runs on a small VPS, a GPU cluster, or right on your phone under Termux, and talks to any model you want: DeepSeek, OpenRouter, Gemini, Groq, or your own endpoint. No lock in.

The agent core is unchanged from upstream. This fork rebrands the product, strips the non core surface (contribution docs, marketing website, research runners, desktop app), and adds the mobile and web clients.

> **Attribution:** Cortes is MIT licensed and built on [Hermes Agent](https://github.com/NousResearch/hermes-agent) © 2025 Nous Research. See [LICENSE](LICENSE).

## Repo layout

* `hermes_cli/` `agent/` `gateway/` `tools/` `skills/` `plugins/`: the agent core, upstream and unmodified
* `apps/mobile/`: the Cortes mobile app, an Expo / React Native shell with chat, canvas preview panel, pre prompts, and BYOK providers
* `apps/webapp/`: the Cortes web app, the same product as a Vite + React page, dev server on port 3000
* `web/`: upstream dashboard UI, the future home of the web app behind auth
* `ui-tui/`: the terminal user interface
* `scripts/`: the on device arm64 hermesc builder for fully on device release builds
* `assets/`: branding

## The build loop

Cortes builds in small phases so you can always see exactly what changed and why.

1. **Requirements phase.** You tell Cortes what you want to build. It asks about screens, stack, and scope before writing a line.
2. **Phase by phase builds.** The first response builds only the hero section (headline, subtext, call to action). Reply "next" to build the next phase, one at a time, with the model explaining each file as it goes.
3. **Live code editor.** While the model writes, the screen becomes a fullscreen editor: file tabs, line numbers, a blinking cursor that follows the typing, and autoscroll. New files appear as tabs the moment their fence opens.
4. **Edit diffs.** Ask for a change and the editor reopens with a real diff: added lines in green, removed lines in red, and a dot on every changed file tab. New files added by an edit show clean, with no diff.
5. **Instant preview.** The moment the model finishes, the editor hands over to the rendered page fullscreen. Close it and the page collapses to a button above the chat; click the button to reopen.

## The editor

A small VS Code style editor lives inside the app. It parses the model output into real files in real time, keeps the diagram and teaching prose out of the way, and shows only what matters: the files being written. The waiting state animates a growing dot while the model prepares its first line.

## Model support (BYOK)

Bring your own key. Nothing is shipped in the app, keys live on your device. Paste any key in Settings and the provider is detected automatically: OpenRouter keys start with sk or, DeepSeek keys start with sk, Gemini keys start with AIza, Groq keys start with gsk underscore. A Custom slot covers any OpenAI compatible endpoint.

* **DeepSeek:** deepseek chat for speed, deepseek reasoner for thinking, with live thinking display
* **OpenRouter:** one key covers hundreds of models, free trial models use the free suffix
* **Custom:** any OpenAI compatible chat completions endpoint, including Gemini and Groq

The exact model ids are shown in the in app picker, which always has a working list even without a network connection, plus a manual entry box for typing any id.

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

Release APK and debug builds run on a PC (or EAS cloud), not on the phone. See the building section below for why.

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

1. The script in `scripts/` builds the Hermes bytecode compiler natively for arm64.
2. System level: aapt2 and cmake must be swapped for arm64 binaries (see the script and the commit history for the exact steps).

For normal development, build the APK on a PC: `cd apps/mobile && npx expo run:android` or EAS cloud.

## Documentation

Upstream docs apply to the agent core: **[hermes agent docs](https://hermes-agent.nousresearch.com/docs/)**.

## License

MIT, see [LICENSE](LICENSE). Fork of [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) © 2025 Nous Research.
