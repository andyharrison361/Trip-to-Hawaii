"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

// Sign in with a one-time code typed into the app (not a magic link). A link would
// open in Safari, which on iPhone doesn't share a login with the home-screen app.
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many emails were sent recently. Wait a few minutes and try again."
          : error.message,
      );
      return;
    }
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: code.replace(/\s/g, ""),
      type: "email",
    });
    if (error) {
      setBusy(false);
      setError("That code didn't work. Check the latest email, or send a new code.");
      return;
    }
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    router.replace(safeNext);
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} className="space-y-4">
        <p className="text-muted">
          We emailed a code to <span className="font-medium text-ink">{email}</span>.
        </p>
        <Field label="Code">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={12}
            placeholder="123456"
            autoFocus
            className={`${inputClass} text-center text-2xl tracking-[0.3em]`}
            required
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" className="w-full" disabled={busy || code.replace(/\D/g, "").length < 6}>
          {busy ? "Checking…" : "Sign in"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
        >
          Use a different email or resend
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className={inputClass}
          required
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Sending…" : "Email me a sign-in code"}
      </Button>
      <p className="text-center text-sm text-muted">New here? The same code creates your account.</p>
    </form>
  );
}
