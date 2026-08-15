import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import Markdown from "@novastera-oss/react-native-markdown-display";

import { extractHtml, PRE_PROMPTS, streamChat } from "../lib/client";
import { PROVIDER_PRESETS, type ProviderConfig, type ProviderId } from "../lib/models";
import { loadActiveProvider, loadProviders } from "../lib/storage";

const GOLD = "#ffc83c";

interface Msg {
  id: number;
  role: "user" | "assistant";
  content: string;
  thinking: string;
  streaming?: boolean;
  error?: string;
}

const mdStyles = StyleSheet.create({
  body: { color: "#e8eaed", fontSize: 15, lineHeight: 22 },
  code_inline: {
    backgroundColor: "#1c2129",
    color: "#ffd479",
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 13,
  },
  fence: {
    backgroundColor: "#101319",
    color: "#e8eaed",
    padding: 10,
    borderRadius: 8,
  },
  code_block: { color: "#d7dce3", fontSize: 13, fontFamily: "monospace" },
  heading1: { color: "#ffffff", fontSize: 20, fontWeight: "700", marginTop: 8 },
  heading2: { color: "#ffffff", fontSize: 17, fontWeight: "700", marginTop: 8 },
  heading3: { color: "#ffffff", fontSize: 15, fontWeight: "600", marginTop: 6 },
  link: { color: "#6ea8fe" },
  blockquote: { borderLeftColor: GOLD, borderLeftWidth: 3, paddingLeft: 10, color: "#b9bfc8" },
  bullet_list_icon: { color: GOLD },
  ordered_list_icon: { color: GOLD },
  hr: { backgroundColor: "#262c36", height: 1, marginVertical: 8 },
});

export default function ChatScreen() {
  const router = useRouter();
  const [providers, setProviders] = useState<Record<ProviderId, ProviderConfig> | null>(null);
  const [activeId, setActiveId] = useState<ProviderId>("deepseek");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const idRef = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    (async () => {
      const [p, a] = await Promise.all([loadProviders(), loadActiveProvider()]);
      setProviders(p);
      setActiveId(a);
    })();
  }, []);

  const active = providers?.[activeId];

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(scrollToEnd, [messages, scrollToEnd]);

  const send = useCallback(
    async (raw: string) => {
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
            error: `No API key for ${active.label}. Add one in Providers & Keys.`,
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
      const conversation = history.map((m) => ({ role: m.role, content: m.content }));

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

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const previewHtml = lastAssistant && !lastAssistant.streaming ? extractHtml(lastAssistant.content) : null;

  const renderItem = ({ item }: { item: Msg }) => (
    <View style={[styles.msgRow, item.role === "user" ? styles.userRow : styles.asstRow]}>
      {item.role === "assistant" && (
        <View style={styles.asstAvatar}>
          <Text style={styles.asstAvatarText}>☤</Text>
        </View>
      )}
      <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.asstBubble]}>
        {item.role === "assistant" && item.thinking ? (
          <View style={styles.thinkingBox}>
            <Text style={styles.thinkingLabel}>thinking…</Text>
            <Text style={styles.thinkingText} numberOfLines={6}>
              {item.thinking}
            </Text>
          </View>
        ) : null}
        {item.content ? (
          <Markdown style={mdStyles}>{item.content}</Markdown>
        ) : item.error ? (
          <Text style={styles.errorText}>{item.error}</Text>
        ) : item.streaming ? (
          <ActivityIndicator color={GOLD} size="small" />
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cortes ☤</Text>
          <Text style={styles.subtitle}>
            {active ? `${active.label} · ${active.model || "no model set"}` : "…"}
          </Text>
        </View>
        <Pressable style={styles.gear} onPress={() => router.push("/settings")} hitSlop={8}>
          <Ionicons name="settings-outline" size={22} color="#e8eaed" />
        </Pressable>
      </View>

      {/* Preview panel — the canvas above the chat */}
      <View style={styles.previewWrap}>
        <Pressable style={styles.previewBar} onPress={() => setPreviewCollapsed((c) => !c)}>
          <Text style={styles.previewLabel}>
            {previewHtml ? "PREVIEW" : "CANVAS"}
          </Text>
          <Ionicons
            name={previewCollapsed ? "chevron-down" : "chevron-up"}
            size={16}
            color="#8b919c"
          />
        </Pressable>
        {!previewCollapsed && (
          <View style={styles.previewBody}>
            {previewHtml ? (
              <WebView source={{ html: previewHtml }} style={styles.previewWeb} />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Ionicons name="grid-outline" size={28} color="#3a4250" />
                <Text style={styles.previewPlaceholderText}>
                  The app Cortes builds will render here. Ask it to build something.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        style={styles.list}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {PRE_PROMPTS.map((p) => (
              <Pressable key={p} style={styles.chip} onPress={() => send(p)}>
                <Text style={styles.chipText}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Cortes to build something…"
            placeholderTextColor="#5a6270"
            multiline
            onSubmitEditing={() => send(input)}
            editable={!streaming}
          />
          {streaming ? (
            <Pressable style={styles.sendBtn} onPress={stop}>
              <Ionicons name="stop" size={20} color="#0a0c10" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDim]}
              onPress={() => send(input)}
              disabled={!input.trim()}
            >
              <Ionicons name="arrow-up" size={20} color="#0a0c10" />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0c10" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1f28",
  },
  title: { color: "#ffffff", fontSize: 20, fontWeight: "700" },
  subtitle: { color: "#8b919c", fontSize: 12, marginTop: 2 },
  gear: { padding: 6, borderRadius: 8, backgroundColor: "#151a22" },
  previewWrap: {
    margin: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f242c",
    overflow: "hidden",
    backgroundColor: "#0d1016",
  },
  previewBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#10141b",
  },
  previewLabel: { color: "#8b919c", fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  previewBody: { height: 180 },
  previewWeb: { flex: 1, backgroundColor: "#ffffff" },
  previewPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#2a3140",
    borderRadius: 8,
    margin: 8,
  },
  previewPlaceholderText: { color: "#5a6270", textAlign: "center", marginTop: 8, fontSize: 13 },
  list: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 24 },
  msgRow: { flexDirection: "row", marginBottom: 14 },
  userRow: { justifyContent: "flex-end" },
  asstRow: { justifyContent: "flex-start", alignItems: "flex-start" },
  asstAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#171d26",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 2,
  },
  asstAvatarText: { color: GOLD, fontSize: 14, fontWeight: "700" },
  bubble: { maxWidth: "84%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  userBubble: { backgroundColor: "#1e2530" },
  asstBubble: { backgroundColor: "transparent", flex: 1 },
  thinkingBox: {
    backgroundColor: "#141a14",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#8a7a2a",
  },
  thinkingLabel: { color: "#a8903a", fontSize: 11, fontWeight: "700", marginBottom: 4 },
  thinkingText: { color: "#7c8366", fontSize: 12, fontStyle: "italic" },
  errorText: { color: "#ff6b6b", fontSize: 14 },
  chips: { paddingHorizontal: 12, paddingBottom: 8, flexGrow: 0 },
  chip: {
    backgroundColor: "#171d26",
    borderColor: "#2a3140",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipText: { color: "#c8cdd6", fontSize: 13 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#1a1f28",
  },
  input: {
    flex: 1,
    backgroundColor: "#12151b",
    color: "#e8eaed",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDim: { opacity: 0.35 },
});
