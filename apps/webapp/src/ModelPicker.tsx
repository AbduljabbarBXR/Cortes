import { useEffect, useMemo, useState } from "react";

interface Props {
  title: string;
  models: string[] | null;
  loading: boolean;
  value: string;
  fallback?: string[];
  onSelect: (m: string) => void;
  onClose: () => void;
  onLoad: () => void;
}

export default function ModelPicker({
  title,
  models,
  loading,
  value,
  fallback = [],
  onSelect,
  onClose,
  onLoad,
}: Props) {
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (models === null && !loading) onLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models === null]);

  const base = models ?? fallback;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((m) => m.toLowerCase().includes(q));
  }, [base, query]);

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
          ) : filtered.length === 0 ? (
            <p className="modelEmpty">No matching models. Type a model id below.</p>
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
        <form
          className="manualRow"
          onSubmit={(e) => {
            e.preventDefault();
            const m = manual.trim();
            if (m) {
              onSelect(m);
              onClose();
            }
          }}
        >
          <input
            className="field"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Or type a model id manually"
            spellCheck={false}
          />
          <button className="manualBtn" type="submit" disabled={!manual.trim()}>
            Set model
          </button>
        </form>
      </div>
    </div>
  );
}
