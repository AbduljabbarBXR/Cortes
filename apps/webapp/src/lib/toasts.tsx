import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ToastKind = "error" | "success" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ToastCtx {
  notify: (kind: ToastKind, text: string) => void;
}

const Ctx = createContext<ToastCtx>({ notify: () => {} });

export function useToast(): ToastCtx {
  return useContext(Ctx);
}

/** Maps a thrown fetch error message to a friendly, human readable notice. */
export function friendlyApiError(message: string): string {
  const m = /HTTP (\d{3})/.exec(message);
  if (!m) return message;
  switch (Number(m[1])) {
    case 401:
      return "Invalid API key. Check the key in Settings.";
    case 402:
      return "Quota exceeded. This API needs more credits.";
    case 403:
      return "Access denied. The key may lack permissions.";
    case 404:
      return "Model not found. Pick a different model.";
    case 429:
      return "Rate limit reached. Wait a moment or switch models.";
    default:
      return `API error ${m[1]}. Try again in a moment.`;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);

  const notify = useCallback((kind: ToastKind, text: string) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  useEffect(() => {
    if (toasts.length > 4) setToasts((t) => t.slice(-4));
  }, [toasts]);

  return (
    <Ctx.Provider value={{ notify }}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
