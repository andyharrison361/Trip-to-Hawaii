import Link from "next/link";
import { InstallGuide } from "@/components/install-guide";
import { buttonClass } from "@/components/ui";

export const metadata = { title: "Add to Home Screen" };

export default function InstallStep() {
  return (
    <>
      <h1 className="mt-12 font-display text-3xl font-semibold tracking-tight">Put it on your Home Screen</h1>
      <p className="mb-6 mt-2 text-lg text-muted">One last step, so it feels like a real app and can send you reminders.</p>
      <InstallGuide />
      <Link href="/" className={buttonClass("primary", "mt-8 w-full")}>
        Go to Today
      </Link>
    </>
  );
}
