import { useState } from "react";

import { APP_TYPES, STACKS, type Brief } from "./lib/build";

interface Props {
  initialType: string;
  onStart: (b: Brief) => void;
  onClose: () => void;
}

export default function Requirements({ initialType, onStart, onClose }: Props) {
  const [appType, setAppType] = useState(initialType);
  const [what, setWhat] = useState("");
  const [screens, setScreens] = useState("");
  const [stack, setStack] = useState(STACKS[0]);
  const [features, setFeatures] = useState("");
  const [notes, setNotes] = useState("");

  const start = () => {
    onStart({ appType, what, screens, stack, features, notes });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settings reqPanel" onClick={(e) => e.stopPropagation()}>
        <div className="settingsHead">
          <h2>What are we building?</h2>
          <button className="closeBtn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <p className="sectionTitle">TYPE OF APP</p>
        <div className="radioGroup">
          {APP_TYPES.map((t) => (
            <button
              key={t}
              className={`radio ${appType === t ? "radioActive" : ""}`}
              onClick={() => setAppType(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="fieldLabel">WHAT DOES IT DO?</label>
        <input
          className="field"
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          placeholder="e.g. lets users track their daily habits"
        />

        <label className="fieldLabel">PAGES OR SCREENS (comma separated)</label>
        <input
          className="field"
          value={screens}
          onChange={(e) => setScreens(e.target.value)}
          placeholder="e.g. home, dashboard, settings"
        />

        <p className="sectionTitle">STACK</p>
        <div className="radioGroup">
          {STACKS.map((t) => (
            <button
              key={t}
              className={`radio ${stack === t ? "radioActive" : ""}`}
              onClick={() => setStack(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="fieldLabel">FEATURES (comma separated)</label>
        <input
          className="field"
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          placeholder="e.g. dark mode, search, offline"
        />

        <label className="fieldLabel">EXTRA NOTES</label>
        <textarea
          className="field reqNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else Cortes should know"
        />

        <button className="saveBtn" onClick={start}>
          Start building
        </button>
      </div>
    </div>
  );
}
