"use client";

import { useSyncExternalStore } from "react";
import { ShareIcon } from "./icons";

function subscribe() {
  return () => {};
}

function detect() {
  const ua = navigator.userAgent;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const safari = ios && !/CriOS|FxiOS|EdgiOS|GSA/.test(ua);
  return standalone ? "installed" : ios ? (safari ? "ios-safari" : "ios-other") : "other";
}

export function InstallGuide() {
  const state = useSyncExternalStore(subscribe, detect, () => "unknown");

  if (state === "installed") {
    return (
      <div className="rounded-3xl bg-sage-soft p-5 text-sage-strong">
        <p className="font-display text-lg font-semibold">You&apos;re all set ✓</p>
        <p className="mt-1">Life Partner is installed on this phone.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {state === "ios-other" && (
        <p className="rounded-2xl bg-sun-soft p-4">
          On iPhone, installing works from <strong>Safari</strong>. Open this page in Safari first, then follow these steps.
        </p>
      )}
      <ol className="space-y-3">
        {[
          <>
            Tap the <strong>Share</strong> button <ShareIcon className="inline h-5 w-5 align-text-bottom" /> at the bottom of Safari (on some
            iPhones, tap <strong>⋯</strong> first).
          </>,
          <>
            Scroll down and tap <strong>Add to Home Screen</strong>.
          </>,
          <>
            Make sure <strong>Open as Web App</strong> is on, then tap <strong>Add</strong>.
          </>,
          <>
            Open <strong>Life Partner</strong> from your Home Screen and sign in once more. The home-screen app keeps its own login,
            separate from Safari.
          </>,
        ].map((step, i) => (
          <li key={i} className="flex gap-3 rounded-3xl bg-card p-4 ring-1 ring-line">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-soft font-semibold text-sage-strong">
              {i + 1}
            </span>
            <span className="leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
      <p className="px-1 text-sm text-muted">
        Why install? Reminders on iPhone only work from the home-screen app, and it opens faster and full-screen.
      </p>
    </div>
  );
}
