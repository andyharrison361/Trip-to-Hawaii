"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((t: Omit<Toast, "id">) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ ...t, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            role="status"
            className="animate-fade pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-canvas shadow-lg"
          >
            <span className="text-[0.95rem]">{toast.message}</span>
            {toast.actionLabel && (
              <button
                className="min-h-9 shrink-0 rounded-xl px-2 font-semibold text-sage-soft underline-offset-2 active:underline"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext>
  );
}
