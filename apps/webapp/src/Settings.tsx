import type { ProviderConfig, ProviderId } from "./lib/models";
import { PROVIDER_IDS } from "./lib/models";
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
  if (!providers) return null;

  const update = (id: ProviderId, patch: Partial<ProviderConfig>) => {
    onProvidersChange({ ...providers, [id]: { ...providers[id], ...patch } });
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
