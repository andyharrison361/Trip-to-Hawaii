"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, GridIcon, PlusIcon, SettingsIcon, SunIcon } from "./icons";
import { cx } from "./ui";

export const OPEN_QUICK_ADD = "lp:open-quick-add";

const tabs = [
  { href: "/", label: "Today", Icon: SunIcon },
  { href: "/areas", label: "Areas", Icon: GridIcon },
  null,
  { href: "/calendar", label: "Calendar", Icon: CalendarIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

export function BottomNav() {
  return <BottomNavView pathname={usePathname()} />;
}

/** Rendered without a pathname while the page shell streams in. */
export function BottomNavView({ pathname }: { pathname: string | null }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-xl items-stretch justify-around px-2">
        {tabs.map((tab) => {
          if (!tab) {
            return (
              <button
                key="add"
                aria-label="Add a task"
                // Dispatching synchronously lets the quick-add input take focus inside this tap,
                // which is what makes iOS show the keyboard.
                onClick={() => window.dispatchEvent(new Event(OPEN_QUICK_ADD))}
                className="-mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-sage text-white shadow-lg shadow-sage/30 ring-4 ring-canvas active:scale-95 active:bg-sage-strong"
              >
                <PlusIcon className="h-8 w-8" />
              </button>
            );
          }
          const active = pathname != null && (tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cx(
                "flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium",
                active ? "text-sage-strong" : "text-muted",
              )}
            >
              <tab.Icon className="h-6 w-6" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
