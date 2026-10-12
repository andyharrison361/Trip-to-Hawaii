import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-3xl font-semibold">Not here</h1>
      <p className="mt-2 text-muted">That page doesn&apos;t exist, or it was deleted.</p>
      <Link href="/" className={buttonClass("primary", "mt-6")}>
        Go to Today
      </Link>
    </main>
  );
}
