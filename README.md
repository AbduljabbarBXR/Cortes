<p align="center">
  <img src="assets/banner.png" alt="Cortes Agent" width="100%">
</p>

# Cortes ☤

**The self-improving AI agent — forked from [Hermes Agent](https://github.com/NousResearch/hermes-agent) by Nous Research.**

Cortes is the agent that grows with you: it creates skills from experience, improves them during use, searches its own past conversations, and builds a deepening model of who you are across sessions. It runs on a $5 VPS, a GPU cluster, or right on your phone under Termux — and talks to any model you want: Nous Portal, OpenRouter, DeepSeek, OpenAI, your own endpoint. No lock-in.

The agent core is unchanged from upstream — this fork rebrands the product and strips the non-core surface (contribution docs, marketing website, research runners, desktop app) to keep the mobile-first footprint lean.

> **Attribution:** Cortes is MIT-licensed and built on [Hermes Agent](https://github.com/NousResearch/hermes-agent) © 2025 Nous Research. See [LICENSE](LICENSE).

---

## Quick Install

### Linux, macOS, WSL2, Termux

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

> **Android / Termux:** Termux is a first-class platform — the repo ships `constraints-termux.txt` and a curated `.[termux]` extra. See the [Termux guide](https://hermes-agent.nousresearch.com/docs/getting-started/termux).

After installation:

```bash
source ~/.bashrc    # reload shell (or: source ~/.zshrc)
cortes              # start chatting!
```

---

## Getting Started

```bash
cortes              # Interactive CLI — start a conversation
cortes model        # Choose your LLM provider and model
cortes tools        # Configure which tools are enabled
cortes config set   # Set individual config values
cortes gateway      # Start the messaging gateway (Telegram, Discord, etc.)
cortes setup        # Run the full setup wizard
cortes update       # Update to the latest version
cortes doctor       # Diagnose any issues
```

## What Cortes Is

| | |
|---|---|
| **A real terminal interface** | Full TUI with multiline editing, slash-command autocomplete, conversation history, interrupt-and-redirect, and streaming tool output. |
| **Lives where you do** | Telegram, Discord, Slack, WhatsApp, Signal, and CLI — all from a single gateway process. |
| **A closed learning loop** | Agent-curated memory, autonomous skill creation, self-improving skills, cross-session recall, dialectic user modeling. |
| **Delegates and parallelizes** | Spawn isolated subagents for parallel workstreams. |
| **Runs anywhere** | Seven terminal backends — local, Docker, SSH, Singularity, Modal, Daytona, Vercel Sandbox — plus Termux on Android. |

## Documentation

Upstream docs apply to the agent core: **[hermes-agent.nousresearch.com/docs](https://hermes-agent.nousresearch.com/docs/)** — quickstart, CLI usage, configuration, memory, skills, MCP, cron.

## License

MIT — see [LICENSE](LICENSE). Fork of [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent), © 2025 Nous Research.
