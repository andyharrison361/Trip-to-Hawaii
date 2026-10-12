"use client";

import { useEffect } from "react";
import { XIcon } from "./icons";

/** A simple bottom sheet for small forms. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-fade absolute inset-0 bg-ink/25" onClick={onClose} />
      <div className="animate-sheet pb-safe absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-[2rem] bg-card px-4 pt-3 shadow-2xl">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-canvas">
            <XIcon />
          </button>
        </div>
        <div className="pb-5 pt-2">{children}</div>
      </div>
    </div>
  );
}
