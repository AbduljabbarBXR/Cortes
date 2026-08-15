import { useState } from "react";

import type { ProviderConfig, ProviderId } from "./lib/models";
import { PROVIDER_IDS, detectProvider, fetchModels } from "./lib/models";
import { saveActiveProvider, saveProviders } from "./lib/storage";

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
  const [quickKey, setQuickKey] = useState("");
  const [detectError, setDetectError] = useState("");
  const [modelsByProvider, setModelsByProvider] = useState<Partial<Record<ProviderId, string[]>>>({});
  const [loadingModels, setLoadingModels] = useState<ProviderId | null>(null);
  if (!providers) return null;

  const loadModels = async (id: ProviderId) => {
    const p = providers[id];
    if (!p.baseUrl || !p.apiKey) {
      setDetectError("Set the base URL and API key first.");
      return;
    }
    setLoadingModels(id);
    try {
      const ids = await fetchModels(p.baseUrl, p.apiKey);
      setModelsByProvider((m) => ({ ...m, [id]: ids }));
    } catch (e) {
      setDetectError((e as Error).message);
    } finally {
      setLoadingModels(null);
    }
  };

  const update = (id: ProviderId, patch: Partial<ProviderConfig>) => {
    onProvidersChange({ ...providers, [id]: { ...providers[id], ...patch } });
  };

  const quickAdd = (key: string) => {
    const detected = detectProvider(key);
    if (!detected) {
      setDetectError("Unknown key format. Pick a provider and add the key manually below.");
      return;
    }
    const p = { ...providers };
    p[detected.id] = {
      ...p[detected.id],
      apiKey: key.trim(),
      baseUrl: detected.baseUrl || p[detected.id].baseUrl,
      model: detected.model || p[detected.id].model,
    };
    onProvidersChange(p);
    onActiveChange(detected.id);
  };

  const save = () => {
    saveProviders(providers);
    saveActiveProvider(activeId);
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settings" onClick={(e) => e.stopPropagation()}>
        <div className="settingsHead">
          <h2>Providers &amp; Keys</h2>
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

        <p className="sectionTitle">ACTIVE PROVIDER</p>
        <div className="radioGroup">
          {PROVIDER_IDS.map((id) => (
            <button
              key={id}
              className={`radio ${activeId === id ? "radioActive" : ""}`}
              onClick={() => onActiveChange(id)}
            >
              {activeId === id ? "◉" : "○"} {providers[id].label}
            </button>
          ))}
        </div>

        {PROVIDER_IDS.map((id) => {
          const p = providers[id];
          return (
            <div key={id} className="card">
              <p className="cardTitle">{p.label}</p>
              {p.hint ? <p className="cardHint">{p.hint}</p> : null}
              <label className="fieldLabel">Base URL</label>
              <input
                className="field"
                value={p.baseUrl}
                onChange={(e) => update(id, { baseUrl: e.target.value })}
                placeholder="https://…"
                spellCheck={false}
              />
              <label className="fieldLabel">API Key</label>
              <input
                className="field"
                type="password"
                value={p.apiKey}
                onChange={(e) => update(id, { apiKey: e.target.value })}
                placeholder="sk-…"
                spellCheck={false}
              />
              <label className="fieldLabel">Model</label>
              <input
                className="field"
                value={p.model}
                onChange={(e) => update(id, { model: e.target.value })}
                placeholder="model id"
                spellCheck={false}
              />
              <button
                className="loadBtn"
                onClick={() => loadModels(id)}
                disabled={loadingModels === id}
              >
                {loadingModels === id ? "Loading…" : "Load models from this provider"}
              </button>
              {modelsByProvider[id] && (
                <div className="modelChips">
                  {modelsByProvider[id]!.map((mid) => (
                    <button
                      key={mid}
                      className={`modelChip ${mid === p.model ? "modelChipActive" : ""}`}
                      onClick={() => update(id, { model: mid })}
                    >
                      {mid}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <button className="saveBtn" onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}
