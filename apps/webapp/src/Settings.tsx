import { useEffect, useState } from "react";

import type { ProviderConfig, ProviderId } from "./lib/models";
import { PROVIDER_IDS, detectProvider, fetchCredits, fetchModels } from "./lib/models";
import { saveActiveProvider, saveProviders } from "./lib/storage";
import { useToast } from "./lib/toasts";
import ModelPicker from "./ModelPicker";

interface Props {
  providers: Record<ProviderId, ProviderConfig> | null;
  activeId: ProviderId;
  onClose: () => void;
  onProvidersChange: (p: Record<ProviderId, ProviderConfig>) => void;
  onActiveChange: (id: ProviderId) => void;
}

export default function Settings({
  providers,
  activeId,
  onClose,
  onProvidersChange,
  onActiveChange,
}: Props) {
  const { notify } = useToast();
  const [tab, setTab] = useState<ProviderId>(activeId);
  const [quickKey, setQuickKey] = useState("");
  const [detectError, setDetectError] = useState("");
  const [models, setModels] = useState<string[] | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    setModels(null);
    setBalance(null);
    if (tab === "openrouter") void checkBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (!providers) return null;

  const p = providers[tab];

  const update = (patch: Partial<ProviderConfig>) => {
    onProvidersChange({ ...providers, [tab]: { ...p, ...patch } });
  };

  const quickAdd = (key: string) => {
    const detected = detectProvider(key);
    if (!detected) {
      setDetectError("Unknown key format. Pick a provider and add the key manually below.");
      return;
    }
    const next = { ...providers };
    next[detected.id] = {
      ...next[detected.id],
      apiKey: key.trim(),
      baseUrl: detected.baseUrl || next[detected.id].baseUrl,
      model: detected.model || next[detected.id].model,
    };
    onProvidersChange(next);
    onActiveChange(detected.id);
    setQuickKey("");
    setDetectError("");
    notify("success", "API key added successfully.");
  };

  const loadModels = async () => {
    if (!p.baseUrl || !p.apiKey) {
      notify("error", "Set the base URL and API key first.");
      return;
    }
    setLoadingModels(true);
    try {
      setModels(await fetchModels(p.baseUrl, p.apiKey));
    } catch (e) {
      notify("error", (e as Error).message);
    } finally {
      setLoadingModels(false);
    }
  };

  const checkBalance = async () => {
    if (!providers.openrouter.apiKey) return;
    setBalanceLoading(true);
    try {
      setBalance(await fetchCredits(providers.openrouter.apiKey));
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  const save = () => {
    saveProviders(providers);
    saveActiveProvider(activeId);
    notify("success", "Saved successfully.");
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settings" onClick={(e) => e.stopPropagation()}>
        <div className="settingsHead">
          <h2>API Settings</h2>
          <button className="closeBtn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <p className="note">
          Keys live in your browser only. Nothing leaves this device except requests to the
          provider you pick.
        </p>

        <p className="sectionTitle">QUICK ADD</p>
        <input
          className="field"
          type="password"
          value={quickKey}
          onChange={(e) => {
            setQuickKey(e.target.value);
            setDetectError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") quickAdd(quickKey);
          }}
          placeholder="Paste an API key, the provider is detected"
          spellCheck={false}
        />
        {detectError && <p className="detectError">{detectError}</p>}
        <button
          className="detectBtn"
          onClick={() => quickAdd(quickKey)}
          disabled={!quickKey.trim()}
        >
          Detect and add
        </button>

        <p className="sectionTitle">PROVIDERS</p>
        <div className="radioGroup">
          {PROVIDER_IDS.map((id) => (
            <button
              key={id}
              className={`radio ${tab === id ? "radioActive" : ""}`}
              onClick={() => setTab(id)}
            >
              {providers[id].label}
            </button>
          ))}
        </div>

        <div className="card">
          <p className="cardTitle">{p.label}</p>
          {p.hint ? <p className="cardHint">{p.hint}</p> : null}

          <label className="fieldLabel">Base URL</label>
          <input
            className="field"
            value={p.baseUrl}
            onChange={(e) => update({ baseUrl: e.target.value })}
            placeholder="https://…"
            spellCheck={false}
          />

          <label className="fieldLabel">API Key</label>
          <input
            className="field"
            type="password"
            value={p.apiKey}
            onChange={(e) => update({ apiKey: e.target.value })}
            placeholder="sk-…"
            spellCheck={false}
          />

          <label className="fieldLabel">Model</label>
          <button className="field modelFieldBtn" onClick={() => setModelPickerOpen(true)}>
            <span className="modelFieldValue">{p.model || "Pick a model"}</span>
            <span className="modelFieldCaret">▾</span>
          </button>

          {tab === "openrouter" && (
            <button className="loadBtn" onClick={checkBalance} disabled={balanceLoading}>
              {balanceLoading
                ? "Checking balance…"
                : balance
                  ? `Credits: ${balance}`
                  : "Check OpenRouter credit balance"}
            </button>
          )}
        </div>

        <button className="saveBtn" onClick={save}>
          Save
        </button>
      </div>

      {modelPickerOpen && (
        <ModelPicker
          title={`${p.label} models`}
          models={models}
          loading={loadingModels}
          value={p.model}
          onSelect={(m) => update({ model: m })}
          onClose={() => setModelPickerOpen(false)}
          onLoad={loadModels}
        />
      )}
    </div>
  );
}
