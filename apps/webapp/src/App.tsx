import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { extractHtml, PRE_PROMPTS, streamChat } from "./lib/client";
import { buildBrief, BUILD_SYSTEM_PROMPT, parseScaffold, stripTags, type Brief } from "./lib/build";
import {
  listConversations,
  loadConversation,
  newConversation,
  saveConversation,
  deleteConversation,
  type Conversation,
  type StoredMsg,
} from "./lib/db";
import {
  estimateTokens,
  fetchCredits,
  fetchModels,
  formatTokens,
  PROVIDER_PRESETS,
  type ProviderConfig,
  type ProviderId,
} from "./lib/models";
import { loadActiveProvider, loadProviders } from "./lib/storage";
import { friendlyApiError, useToast } from "./lib/toasts";
import ModelPicker from "./ModelPicker";
import Requirements from "./Requirements";
import Settings from "./Settings";

interface Msg extends StoredMsg {
  id: number;
  streaming?: boolean;
}

interface Usage {
  prompt: number;
  completion: number;
}

const BUILD_TYPES: Record<string, string> = {
  "Build a website": "Website",
  "Build a backend API": "Backend API",
  "Scaffold an AI system": "AI system",
};

export default function App() {
  const { notify } = useToast();
  const [providers, setProviders] = useState<Record<ProviderId, ProviderConfig> | null>(null);
  const [activeId, setActiveId] = useState<ProviderId>("deepseek");
  const [convo, setConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [view, setView] = useState<"chat" | "preview">("chat");
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [scaffoldTab, setScaffoldTab] = useState<"scaffold" | "preview">("scaffold");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [reqType, setReqType] = useState("Website");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [chatUsage, setChatUsage] = useState<Usage>({ prompt: 0, completion: 0 });
  const [sessionUsage, setSessionUsage] = useState<Usage>({ prompt: 0, completion: 0 });
  const [balance, setBalance] = useState<string | null>(null);
  const [usageOpen, setUsageOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [headerModels, setHeaderModels] = useState<string[] | null>(null);
  const [loadingHeaderModels, setLoadingHeaderModels] = useState(false);
  const idRef = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoPreviewedRef = useRef<number | null>(null);

  useEffect(() => {
    setProviders(loadProviders());
    setActiveId(loadActiveProvider());
    const first = listConversations()[0];
    if (first) {
      setConvo(first);
      setMessages(first.messages.map(withId(first)));
      setActiveId(first.providerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = providers?.[activeId];

  function withId(c: Conversation) {
    return (m: StoredMsg, i: number): Msg => ({ ...m, id: i + 1 });
  }

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!convo) return;
    saveConversation({
      ...convo,
      updatedAt: Date.now(),
      messages: messages.map(({ id: _id, streaming: _s, ...m }) => m),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convo?.id, messages, convo?.providerId, convo?.model, convo?.title]);

  useEffect(() => {
    if (activeId === "openrouter" && providers?.openrouter.apiKey) {
      fetchCredits(providers.openrouter.apiKey)
        .then(setBalance)
        .catch(() => setBalance(null));
    } else {
      setBalance(null);
    }
  }, [activeId, providers]);

  const send = useCallback(
    async (raw: string, systemPrompt?: string) => {
      const text = raw.trim();
      if (!text || streaming || !providers || !active || !convo) return;
      if (!active.apiKey) {
        notify("error", `No API key for ${active.label}. Add one in Settings.`);
        return;
      }

      const userMsg: Msg = {
        id: idRef.current++,
        role: "user",
        content: text,
        thinking: "",
      };
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
      const conversation: { role: "user" | "assistant" | "system"; content: string }[] =
        systemPrompt
          ? [
              { role: "system", content: systemPrompt },
              ...history.map((m) => ({ role: m.role, content: m.content })),
            ]
          : history.map((m) => ({ role: m.role, content: m.content }));

      const promptText = history.map((m) => m.content).join("") + (systemPrompt ?? "");
      setChatUsage((u) => ({ ...u, prompt: u.prompt + estimateTokens(promptText) }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat({
          baseURL: active.baseUrl,
          apiKey: active.apiKey,
          model: convo.model,
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
          onUsage: (u) => {
            const add = (prev: Usage): Usage => ({
              prompt: prev.prompt + u.promptTokens,
              completion: prev.completion + u.completionTokens,
            });
            setChatUsage((prev) => add(prev));
            setSessionUsage((prev) => add(prev));
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
                  error: isAbort ? "Stopped." : friendlyApiError(err.message),
                }
              : msg
          )
        );
        if (!isAbort) notify("error", friendlyApiError(err.message));
        setStreaming(false);
      }
    },
    [messages, streaming, providers, active, convo, notify]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const startBuild = useCallback(
    (b: Brief) => {
      setReqOpen(false);
      void send(buildBrief(b), BUILD_SYSTEM_PROMPT);
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

  useEffect(() => {
    if (
      previewHtml &&
      view === "chat" &&
      lastAssistant &&
      autoPreviewedRef.current !== lastAssistant.id
    ) {
      autoPreviewedRef.current = lastAssistant.id;
      setView("preview");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewHtml, view, lastAssistant?.id]);

  const openChat = useCallback(
    (id: string) => {
      const c = loadConversation(id);
      if (!c) return;
      setConvo(c);
      setMessages(c.messages.map((m, i) => ({ ...m, id: i + 1 })));
      setActiveId(c.providerId);
      setDrawerOpen(false);
      setView("chat");
      setChatUsage({ prompt: 0, completion: 0 });
    },
    []
  );

  const newChat = useCallback(() => {
    const c = newConversation(activeId, active?.model ?? "");
    setConvo(c);
    setMessages([]);
    setChatUsage({ prompt: 0, completion: 0 });
    setView("chat");
    setDrawerOpen(false);
  }, [activeId, active]);

  const deleteChat = useCallback(
    (id: string) => {
      deleteConversation(id);
      if (convo?.id === id) {
        const first = listConversations()[0];
        if (first) openChat(first.id);
        else newChat();
      } else {
        setDrawerOpen(true);
      }
    },
    [convo, openChat, newChat]
  );

  const renameChat = useCallback(
    (id: string) => {
      const c = loadConversation(id);
      if (!c) return;
      const title = window.prompt("Rename chat", c.title);
      if (title && title.trim()) {
        c.title = title.trim().slice(0, 60);
        saveConversation(c);
        if (convo?.id === id) setConvo({ ...c });
      }
    },
    [convo]
  );

  const exportChat = useCallback(() => {
    if (!convo) return;
    const blob = new Blob([JSON.stringify(convo, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${convo.title.replace(/[^a-z0-9]+/gi, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("success", "Chat exported as JSON.");
  }, [convo, notify]);

  const setModel = useCallback(
    (m: string) => {
      setConvo((c) => (c ? { ...c, model: m } : c));
    },
    []
  );

  const openHeaderPicker = useCallback(async () => {
    setModelPickerOpen(true);
    if (headerModels === null && active && active.apiKey) {
      setLoadingHeaderModels(true);
      try {
        setHeaderModels(await fetchModels(active.baseUrl, active.apiKey));
      } catch (e) {
        notify("error", friendlyApiError((e as Error).message));
      } finally {
        setLoadingHeaderModels(false);
      }
    }
  }, [headerModels, active, notify]);

  const conversations = drawerOpen ? listConversations() : [];
  const chatTokens = chatUsage.prompt + chatUsage.completion;
  const sessionTokens = sessionUsage.prompt + sessionUsage.completion;

  const renderFences = () => (
    <div className="scaffoldView">
      {scaffold!.diagramTags.length > 0 && <pre className="diagram">{scaffold!.diagramText}</pre>}
      {scaffold!.allTags.length > 0 && (
        <div className="tagChips">
          {scaffold!.allTags.map((t) => (
            <button
              key={t}
              className={`tagChip ${selectedTag === t ? "tagChipActive" : ""}`}
              onClick={() => {
                setSelectedTag((cur) => (cur === t ? null : t));
                const idx = scaffold!.fences.findIndex((f) => f.tags.includes(t));
                if (idx >= 0) {
                  document.getElementById(`fence-${idx}`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }
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
          onClick={() => f.tags.length > 0 && setSelectedTag((cur) => (cur === f.tags[0] ? null : f.tags[0]))}
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
  );

  const composerInput = (
    <input
      ref={inputRef}
      className="input"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          void send(input);
        }
      }}
      placeholder="Type a message to Cortes…"
      disabled={streaming}
    />
  );

  const sendBtn = streaming ? (
    <button className="sendBtn" onClick={stop} title="Stop">
      ■
    </button>
  ) : (
    <button className="sendBtn" onClick={() => void send(input)} disabled={!input.trim()} title="Send">
      ↑
    </button>
  );

  return (
    <div className="app">
      {view === "preview" && previewHtml ? (
        <>
          <iframe className="fullscreenFrame" srcDoc={previewHtml} title="preview" />
          <div className="miniBar">
            <button className="backBtn" onClick={() => setView("chat")}>
              ◀ Code
            </button>
            <div className="miniInputWrap" onClick={() => setView("chat")}>
              {composerInput}
            </div>
            {sendBtn}
          </div>
        </>
      ) : (
        <>
          <header className="header">
            <button className="menuBtn" onClick={() => setDrawerOpen(true)} title="Chats">
              ☰
            </button>
            <div className="headerCenter">
              <h1 className="title">Cortes ☤</h1>
              <button className="modelBadge" onClick={openHeaderPicker} title="Change model">
                {active ? `${active.label} · ${convo?.model || "no model set"}` : "…"}
                <span className="modelBadgeCaret">▾</span>
              </button>
            </div>
            <div className="headerRight">
              <button
                className="usageBadge"
                onClick={() => setUsageOpen((u) => !u)}
                title="Token usage"
              >
                {formatTokens(chatTokens)} tokens
              </button>
              <button className="gear" onClick={() => setSettingsOpen(true)} title="Settings">
                ⚙
              </button>
            </div>
            {usageOpen && (
              <div className="usagePop">
                <p className="usageRow">
                  <span>This chat</span>
                  <span>
                    {formatTokens(chatUsage.prompt)} in · {formatTokens(chatUsage.completion)} out
                  </span>
                </p>
                <p className="usageRow">
                  <span>This session</span>
                  <span>
                    {formatTokens(sessionUsage.prompt)} in · {formatTokens(sessionUsage.completion)} out
                  </span>
                </p>
                <p className="usageRow">
                  <span>Session total</span>
                  <span>{formatTokens(sessionTokens)}</span>
                </p>
                {balance !== null && (
                  <p className="usageRow">
                    <span>OpenRouter credits</span>
                    <span>{balance}</span>
                  </p>
                )}
                <p className="usageHint">
                  Counts come from the API when it reports usage, otherwise a text estimate.
                </p>
              </div>
            )}
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
                  Code
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
                  renderFences()
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
            {messages.length === 0 && (
              <div className="chatEmpty">
                <p className="chatEmptyTitle">Build something with Cortes</p>
                <p className="chatEmptySub">Pick a starting point below.</p>
              </div>
            )}
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
              {composerInput}
              {sendBtn}
            </div>
          </footer>
        </>
      )}

      {drawerOpen && (
        <div className="overlay" onClick={() => setDrawerOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="settingsHead">
              <h2>Chats</h2>
              <button className="closeBtn" onClick={() => setDrawerOpen(false)} title="Close">
                ✕
              </button>
            </div>
            <button className="newChatBtn" onClick={newChat}>
              + New chat
            </button>
            <div className="convoList">
              {conversations.length === 0 && <p className="modelEmpty">No chats yet.</p>}
              {conversations.map((c) => (
                <div key={c.id} className={`convoRow ${c.id === convo?.id ? "convoRowActive" : ""}`}>
                  <button className="convoMain" onClick={() => openChat(c.id)}>
                    <span className="convoTitle">{c.title}</span>
                    <span className="convoMeta">
                      {c.providerId} · {c.messages.length} messages
                    </span>
                  </button>
                  <div className="convoActions">
                    <button className="convoAction" onClick={() => renameChat(c.id)} title="Rename">
                      ✎
                    </button>
                    <button
                      className="convoAction"
                      onClick={() => {
                        if (window.confirm("Delete this chat?")) deleteChat(c.id);
                      }}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="loadBtn" onClick={exportChat} disabled={!convo}>
              Export current chat as JSON
            </button>
          </div>
        </div>
      )}

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
      {modelPickerOpen && (
        <ModelPicker
          title="Models for this chat"
          models={headerModels}
          loading={loadingHeaderModels}
          value={convo?.model ?? ""}
          onSelect={setModel}
          onClose={() => setModelPickerOpen(false)}
          onLoad={() => {
            if (!active?.apiKey) {
              notify("error", "Set an API key in Settings first.");
              return;
            }
            setLoadingHeaderModels(true);
            fetchModels(active.baseUrl, active.apiKey)
              .then(setHeaderModels)
              .catch((e) => notify("error", friendlyApiError((e as Error).message)))
              .finally(() => setLoadingHeaderModels(false));
          }}
        />
      )}
    </div>
  );
}
