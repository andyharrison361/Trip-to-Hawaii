import Link from "next/link";
import { InstallGuide } from "@/components/install-guide";
import { buttonClass } from "@/components/ui";

export const metadata = { title: "Add to Home Screen" };

export default function InstallPage() {
  return (
    <main className="pt-safe mx-auto max-w-xl px-5 pb-16">
      <h1 className="mt-12 font-display text-3xl font-semibold tracking-tight">Add to Home Screen</h1>
      <p className="mb-6 mt-2 text-lg text-muted">Install Life Partner on your iPhone in four taps.</p>
      <InstallGuide />
      <Link href="/" className={buttonClass("secondary", "mt-8 w-full")}>
        Back to the app
      </Link>
    </main>
  );
}
