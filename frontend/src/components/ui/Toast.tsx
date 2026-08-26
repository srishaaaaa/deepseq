"use client";

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';

type ToastType = 'success' | 'error' | 'info';
type ToastOptions = { type?: ToastType; duration?: number };
type ToastItem = { id: number; message: string; type: ToastType };

type ToastContextValue = {
  show: (message: string, opts?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, React.ReactElement> = {
  success: <FiCheckCircle className="text-success-400" />,
  error: <FiAlertCircle className="text-danger-400" />,
  info: <FiInfo className="text-info-400" />,
};

/** Global toast host, mounted once in layout.tsx. Additive-only: existing
 * inline error/success text on individual pages is untouched -- this is for
 * new transient confirmations, not a replacement for existing state-driven
 * messages. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, opts: ToastOptions = {}) => {
    const id = nextId.current++;
    const type = opts.type ?? 'info';
    setToasts((prev) => [...prev, { id, message, type }]);
    const duration = opts.duration ?? 3000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[2000] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="animate-slide-up pointer-events-auto flex items-center gap-2 rounded-(--radius-control) bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white shadow-(--shadow-elevated) max-w-sm"
          >
            {ICONS[t.type]}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Returns a no-op `show` (rather than throwing) when used outside the
 * provider, so any UI primitive that opts into toasts stays safe even if a
 * page hasn't picked up ToastProvider yet during the incremental rollout. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  return { show: () => {} };
}
