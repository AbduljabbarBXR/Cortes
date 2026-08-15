import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { extractHtml, PRE_PROMPTS, streamChat } from "./lib/client";
import { buildBrief, BUILD_SYSTEM_PROMPT, parseScaffold, stripTags, type Brief } from "./lib/build";
import { PROVIDER_PRESETS, type ProviderConfig, type ProviderId } from "./lib/models";
import { loadActiveProvider, loadProviders } from "./lib/storage";
import Requirements from "./Requirements";
import Settings from "./Settings";

interface Msg {
  id: number;
  role: "user" | "assistant";
  content: string;
  thinking: string;
  streaming?: boolean;
  error?: string;
}

const BUILD_TYPES: Record<string, string> = {
  "Build a website": "Website",
  "Build a mobile app": "Mobile app",
  "Build a backend API": "Backend API",
  "Scaffold an AI system": "AI system",
};

export default function App() {
  const [providers, setProviders] = useState<Record<ProviderId, ProviderConfig> | null>(null);
  const [activeId, setActiveId] = useState<ProviderId>("deepseek");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [reqType, setReqType] = useState("Website");
  const [scaffoldTab, setScaffoldTab] = useState<"scaffold" | "preview">("scaffold");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const idRef = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProviders(loadProviders());
    setActiveId(loadActiveProvider());
  }, []);

  const active = providers?.[activeId];

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const send = useCallback(
    async (raw: string, systemPrompt?: string) => {
      const text = raw.trim();
      if (!text || streaming || !providers || !active) return;
      if (!active.apiKey) {
        setMessages((m) => [
          ...m,
          {
            id: idRef.current++,
            role: "assistant",
            content: "",
            thinking: "",
            error: `No API key for ${active.label}. Add one in Settings.`,
          },
        ]);
        return;
      }

      const userMsg: Msg = { id: idRef.current++, role: "user", content: text, thinking: "" };
      const asstMsg: Msg = {
        id: idRef.current++,
        role: "assistant",
        content: "",
        thinking: "",
        streaming: true,
      };
      setMessages((m) => [...m, userMsg, asstMsg]);
      setInput("");
      setStreaming(true);

      const history: Msg[] = [...messages, userMsg];
      const conversation: { role: "user" | "assistant" | "system"; content: string }[] = systemPrompt
        ? [{ role: "system", content: systemPrompt }, ...history.map((m) => ({ role: m.role, content: m.content }))]
        : history.map((m) => ({ role: m.role, content: m.content }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat({
          baseURL: active.baseUrl,
          apiKey: active.apiKey,
          model: active.model,
          messages: conversation,
          signal: controller.signal,
          onText: (delta) => {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === asstMsg.id ? { ...msg, content: msg.content + delta } : msg
              )
            );
          },
          onReasoning: (delta) => {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === asstMsg.id ? { ...msg, thinking: msg.thinking + delta } : msg
              )
            );
          },
          onDone: () => {
            setMessages((m) =>
              m.map((msg) => (msg.id === asstMsg.id ? { ...msg, streaming: false } : msg))
            );
            setStreaming(false);
          },
        });
      } catch (e: unknown) {
        const err = e as Error;
        const isAbort = err.name === "AbortError";
        setMessages((m) =>
          m.map((msg) =>
            msg.id === asstMsg.id
              ? {
                  ...msg,
                  streaming: false,
                  error: isAbort ? "Stopped." : `Failed: ${err.message}`,
                }
              : msg
          )
        );
        if (!isAbort) console.warn("stream error", err);
        setStreaming(false);
      }
    },
    [messages, streaming, providers, active]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const startBuild = useCallback(
    (b: Brief) => {
      setReqOpen(false);
      const brief = buildBrief(b);
      void send(brief, BUILD_SYSTEM_PROMPT);
    },
    [send]
  );

  const onPrePrompt = useCallback(
    (p: string) => {
      const t = BUILD_TYPES[p];
      if (t) {
        setReqType(t);
        setReqOpen(true);
      } else {
        void send(p);
      }
    },
    [send]
  );

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const previewHtml =
    lastAssistant && !lastAssistant.streaming ? extractHtml(lastAssistant.content) : null;
  const scaffold = useMemo(
    () => (lastAssistant && !lastAssistant.streaming ? parseScaffold(lastAssistant.content) : null),
    [lastAssistant]
  );
  const hasScaffold = scaffold !== null && scaffold.allTags.length > 0;

  const selectTag = useCallback((tag: string) => {
    setSelectedTag((cur) => (cur === tag ? null : tag));
  }, []);

  const scrollToFence = useCallback((idx: number) => {
    const el = document.getElementById(`fence-${idx}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 className="title">Cortes ☤</h1>
          <p className="subtitle">
            {active ? `${active.label} · ${active.model || "no model set"}` : "…"}
          </p>
        </div>
        <button className="gear" onClick={() => setSettingsOpen(true)} title="Providers">
          ⚙
        </button>
      </header>

      <section className="preview">
        <button className="previewBar" onClick={() => setPreviewCollapsed((c) => !c)}>
          <span className="previewLabel">
            {hasScaffold ? "BUILD" : previewHtml ? "PREVIEW" : "CANVAS"}
          </span>
          <span>{previewCollapsed ? "▾" : "▴"}</span>
        </button>
        {!previewCollapsed && hasScaffold && (
          <div className="scaffoldTabs">
            <button
              className={`scaffoldTab ${scaffoldTab === "scaffold" ? "scaffoldTabActive" : ""}`}
              onClick={() => setScaffoldTab("scaffold")}
            >
              Scaffold
            </button>
            <button
              className={`scaffoldTab ${scaffoldTab === "preview" ? "scaffoldTabActive" : ""}`}
              onClick={() => setScaffoldTab("preview")}
            >
              Preview
            </button>
          </div>
        )}
        {!previewCollapsed && (
          <div className="previewBody">
            {hasScaffold && scaffoldTab === "scaffold" ? (
              <div className="scaffoldView">
                {scaffold!.diagramTags.length > 0 && (
                  <pre className="diagram">{scaffold!.diagramText}</pre>
                )}
                {scaffold!.allTags.length > 0 && (
                  <div className="tagChips">
                    {scaffold!.allTags.map((t) => (
                      <button
                        key={t}
                        className={`tagChip ${selectedTag === t ? "tagChipActive" : ""}`}
                        onClick={() => {
                          selectTag(t);
                          const idx = scaffold!.fences.findIndex((f) => f.tags.includes(t));
                          if (idx >= 0) scrollToFence(idx);
                        }}
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                )}
                {scaffold!.fences.map((f, i) => (
                  <div
                    key={i}
                    id={`fence-${i}`}
                    className={`scaffoldFence ${
                      selectedTag && !f.tags.includes(selectedTag) ? "fenceDim" : ""
                    } ${selectedTag && f.tags.includes(selectedTag) ? "fenceActive" : ""}`}
                    onClick={() => f.tags.length > 0 && selectTag(f.tags[0])}
                  >
                    <div className="fenceHead">
                      <span>{f.title || f.lang}</span>
                      {f.tags.map((t) => (
                        <span key={t} className="fenceTag">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <pre className="fenceCode">
                      <code>{stripTags(f.code)}</code>
                    </pre>
                  </div>
                ))}
              </div>
            ) : previewHtml ? (
              <iframe className="previewFrame" srcDoc={previewHtml} title="preview" />
            ) : (
              <div className="previewPlaceholder">
                <div className="gridIcon">▦</div>
                <p>The app Cortes builds will render here. Ask it to build something.</p>
              </div>
            )}
          </div>
        )}
      </section>

      <main className="chat" ref={listRef}>
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "row user" : "row assistant"}>
            {m.role === "assistant" && <div className="avatar">☤</div>}
            <div className="bubble">
              {m.role === "assistant" && m.thinking && (
                <div className="thinking">
                  <p className="thinkingLabel">thinking…</p>
                  <p className="thinkingText">{m.thinking}</p>
                </div>
              )}
              {m.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              ) : m.error ? (
                <p className="error">{m.error}</p>
              ) : m.streaming ? (
                <p className="typing">…</p>
              ) : null}
            </div>
          </div>
        ))}
      </main>

      <footer className="composer">
        {messages.length === 0 && (
          <div className="chips">
            {PRE_PROMPTS.map((p) => (
              <button key={p} className="chip" onClick={() => onPrePrompt(p)}>
                {p}
              </button>
            ))}
          </div>
        )}
        <div className="composerRow">
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask Cortes to build something…"
            disabled={streaming}
          />
          {streaming ? (
            <button className="sendBtn" onClick={stop} title="Stop">
              ■
            </button>
          ) : (
            <button
              className="sendBtn"
              onClick={() => send(input)}
              disabled={!input.trim()}
              title="Send"
            >
              ↑
            </button>
          )}
        </div>
      </footer>

      {reqOpen && (
        <Requirements
          initialType={reqType}
          onStart={startBuild}
          onClose={() => setReqOpen(false)}
        />
      )}
      {settingsOpen && (
        <Settings
          providers={providers}
          activeId={activeId}
          onClose={() => setSettingsOpen(false)}
          onProvidersChange={setProviders}
          onActiveChange={setActiveId}
        />
      )}
    </div>
  );
}
