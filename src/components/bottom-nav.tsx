"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GridIcon, PlusIcon, SettingsIcon, SunIcon, WeekIcon } from "./icons";
import { Wordmark, cx } from "./ui";

export const OPEN_QUICK_ADD = "samepage:open-quick-add";

const tabs = [
  { href: "/", label: "Today", Icon: SunIcon },
  { href: "/week", label: "Week", Icon: WeekIcon },
  { href: "/areas", label: "Areas", Icon: GridIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

// Dispatching synchronously lets the quick-add input take focus inside this tap,
// which is what makes iOS show the keyboard.
const openQuickAdd = () => window.dispatchEvent(new Event(OPEN_QUICK_ADD));

function isActive(pathname: string | null, href: string) {
  if (pathname == null) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomNav() {
  return <BottomNavView pathname={usePathname()} />;
}

/**
 * Phones: a tab bar at the bottom with a big + in the middle.
 * Computers: a sidebar on the left. Rendered without a pathname while the page shell streams in.
 */
export function BottomNavView({ pathname }: { pathname: string | null }) {
  return (
    <>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-xl items-stretch justify-around px-2">
          {[tabs[0], tabs[1], null, tabs[2], tabs[3]].map((tab) => {
            if (!tab) {
              return (
                <button
                  key="add"
                  aria-label="Add to the planner"
                  onClick={openQuickAdd}
                  className="-mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 ring-4 ring-canvas active:scale-95 active:bg-accent-strong"
                >
                  <PlusIcon className="h-8 w-8" />
                </button>
              );
            }
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cx(
                  "flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium",
                  active ? "text-accent-strong" : "text-muted",
                )}
              >
                <tab.Icon className="h-6 w-6" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-card/60 px-4 py-6 lg:flex">
        <Link href="/" className="px-2">
          <Wordmark />
        </Link>
        <button
          onClick={openQuickAdd}
          className="mt-8 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-4 font-medium text-white shadow-sm active:bg-accent-strong"
        >
          <PlusIcon className="h-5 w-5" />
          Add to the planner
        </button>
        <ul className="mt-6 space-y-1">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={cx(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium",
                    active ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-canvas hover:text-ink",
                  )}
                >
                  <tab.Icon className="h-5 w-5" />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-auto px-2 font-hand text-lg leading-tight text-muted">Same page, same plan.</p>
      </nav>
    </>
  );
}
