import { Suspense } from "react";
import { BrandMark } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 pb-16">
      <div className="mb-8">
        <BrandMark className="mb-6 h-16 w-16" />
        <h1 className="font-display text-4xl font-semibold tracking-tight">Same Page</h1>
        <p className="mt-2 text-lg text-muted">One shared planner for the two of you. Practices, appointments, chores and everything in between.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
