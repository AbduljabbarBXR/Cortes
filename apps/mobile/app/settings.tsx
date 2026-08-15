import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PROVIDER_IDS, PROVIDER_PRESETS, type ProviderConfig, type ProviderId } from "../lib/models";
import {
  loadActiveProvider,
  loadProviders,
  saveActiveProvider,
  saveProviders,
} from "../lib/storage";

const GOLD = "#ffc83c";

export default function SettingsScreen() {
  const [providers, setProviders] = useState<Record<ProviderId, ProviderConfig> | null>(null);
  const [activeId, setActiveId] = useState<ProviderId>("deepseek");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, a] = await Promise.all([loadProviders(), loadActiveProvider()]);
      setProviders(p);
      setActiveId(a);
    })();
  }, []);

  if (!providers) return null;

  const update = (id: ProviderId, patch: Partial<ProviderConfig>) => {
    setProviders((p) => (p ? { ...p, [id]: { ...p[id], ...patch } } : p));
    setDirty(true);
  };

  const save = async () => {
    if (!providers) return;
    await saveProviders(providers);
    await saveActiveProvider(activeId);
    setDirty(false);
    Alert.alert("Saved", "Providers stored on-device (SecureStore).");
  };

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>
          Keys live on your device only. Nothing leaves the phone except requests to the
          provider you pick. Env defaults (EXPO_PUBLIC_*) show as placeholders.
        </Text>

        <Text style={styles.sectionTitle}>ACTIVE PROVIDER</Text>
        <View style={styles.radioGroup}>
          {PROVIDER_IDS.map((id) => (
            <Pressable
              key={id}
              style={[styles.radio, activeId === id && styles.radioActive]}
              onPress={() => {
                setActiveId(id);
                setDirty(true);
              }}
            >
              <Ionicons
                name={activeId === id ? "radio-button-on" : "radio-button-off"}
                size={16}
                color={activeId === id ? GOLD : "#5a6270"}
              />
              <Text style={[styles.radioText, activeId === id && styles.radioTextActive]}>
                {providers[id].label}
              </Text>
            </Pressable>
          ))}
        </View>

        {PROVIDER_IDS.map((id) => {
          const p = providers[id];
          return (
            <View key={id} style={styles.card}>
              <Text style={styles.cardTitle}>{p.label}</Text>
              {p.hint ? <Text style={styles.cardHint}>{p.hint}</Text> : null}
              <Text style={styles.fieldLabel}>Base URL</Text>
              <TextInput
                style={styles.input}
                value={p.baseUrl}
                onChangeText={(t) => update(id, { baseUrl: t })}
                placeholder="https://…"
                placeholderTextColor="#3d4450"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.fieldLabel}>API Key</Text>
              <TextInput
                style={styles.input}
                value={p.apiKey}
                onChangeText={(t) => update(id, { apiKey: t })}
                placeholder={
                  id === "openrouter" ? "sk-or-… (free :free models for trial)" : "sk-…"
                }
                placeholderTextColor="#3d4450"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <Text style={styles.fieldLabel}>Model</Text>
              <TextInput
                style={styles.input}
                value={p.model}
                onChangeText={(t) => update(id, { model: t })}
                placeholder="model-id"
                placeholderTextColor="#3d4450"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          );
        })}

        <Pressable style={[styles.saveBtn, !dirty && styles.saveBtnDim]} onPress={save} disabled={!dirty}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0c10" },
  content: { padding: 16, paddingBottom: 48 },
  note: { color: "#8b919c", fontSize: 13, lineHeight: 19, marginBottom: 16 },
  sectionTitle: { color: "#5a6270", fontSize: 11, fontWeight: "700", letterSpacing: 2, marginBottom: 8 },
  radioGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  radio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#262c36",
    backgroundColor: "#10141b",
  },
  radioActive: { borderColor: GOLD },
  radioText: { color: "#c8cdd6", fontSize: 13 },
  radioTextActive: { color: GOLD, fontWeight: "600" },
  card: {
    backgroundColor: "#10141b",
    borderColor: "#1f242c",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { color: "#ffffff", fontSize: 16, fontWeight: "700", marginBottom: 2 },
  cardHint: { color: "#6b7280", fontSize: 12, marginBottom: 12 },
  fieldLabel: { color: "#5a6270", fontSize: 11, fontWeight: "600", marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: "#171d26",
    color: "#e8eaed",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDim: { opacity: 0.4 },
  saveText: { color: "#0a0c10", fontSize: 15, fontWeight: "700" },
});
