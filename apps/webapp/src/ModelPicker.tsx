import { useEffect, useMemo, useState } from "react";

interface Props {
  title: string;
  models: string[] | null;
  loading: boolean;
  value: string;
  onSelect: (m: string) => void;
  onClose: () => void;
  onLoad: () => void;
}

export default function ModelPicker({
  title,
  models,
  loading,
  value,
  onSelect,
  onClose,
  onLoad,
}: Props) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (models === null && !loading) onLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models === null]);

  const filtered = useMemo(() => {
    if (!models) return [];
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.toLowerCase().includes(q));
  }, [models, query]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modelPicker" onClick={(e) => e.stopPropagation()}>
        <div className="settingsHead">
          <h2>{title}</h2>
          <button className="closeBtn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <input
          className="field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search models…"
          autoFocus
          spellCheck={false}
        />
        <div className="modelList">
          {loading ? (
            <p className="modelEmpty">Loading…</p>
          ) : models === null ? (
            <p className="modelEmpty">No models loaded yet.</p>
          ) : filtered.length === 0 ? (
            <p className="modelEmpty">No matches for "{query}".</p>
          ) : (
            filtered.map((m) => (
              <button
                key={m}
                className={`modelRow ${m === value ? "modelRowActive" : ""}`}
                onClick={() => {
                  onSelect(m);
                  onClose();
                }}
              >
                <span className="modelRowId">{m}</span>
                {m === value && <span className="modelRowCheck">✓</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
