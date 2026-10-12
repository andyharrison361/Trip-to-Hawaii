import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 pb-16">
      <div className="mb-8">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage">
          <span className="relative block h-6 w-9">
            <span className="absolute left-0 h-6 w-6 rounded-full border-[2.5px] border-canvas" />
            <span className="absolute left-3 h-6 w-6 rounded-full border-[2.5px] border-[#f3d9c6]" />
          </span>
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Life Partner</h1>
        <p className="mt-2 text-lg text-muted">Share the load. Let the app do the reminding.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
