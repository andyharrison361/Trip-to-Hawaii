// Shared UI building blocks.

import Link from "next/link";
import { ChevronLeftIcon } from "./icons";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("rounded-3xl bg-card p-4 shadow-[0_1px_2px_rgba(60,40,20,0.05)] ring-1 ring-line", className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="pt-safe">
      <div className="flex min-h-12 items-center justify-between pt-3">
        {back ? (
          <Link href={back} className="-ml-2 flex h-11 items-center gap-1 rounded-full px-2 text-sage-strong active:bg-sage-soft">
            <ChevronLeftIcon className="h-5 w-5" />
            <span>Back</span>
          </Link>
        ) : (
          <span />
        )}
        {action}
      </div>
      <h1 className="font-display text-[1.9rem] font-semibold leading-tight tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
    </header>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-7 flex items-baseline justify-between px-1">
      <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {aside}
    </div>
  );
}

const buttonStyles = {
  primary: "bg-sage text-white active:bg-sage-strong disabled:opacity-50",
  secondary: "bg-sage-soft text-sage-strong active:brightness-95 disabled:opacity-50",
  ghost: "text-sage-strong active:bg-sage-soft disabled:opacity-50",
  danger: "text-clay active:bg-clay-soft disabled:opacity-50",
};

export function buttonClass(variant: keyof typeof buttonStyles = "primary", className?: string) {
  return cx(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[1.02rem] font-medium transition",
    buttonStyles[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

export const inputClass =
  "block min-h-12 w-full rounded-2xl border-0 bg-canvas px-4 py-3 text-ink ring-1 ring-line placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-sage";

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block px-1 text-sm text-muted">{hint}</span>}
    </label>
  );
}

const TONES = ["bg-sage-soft text-sage-strong", "bg-clay-soft text-clay"];

export function Avatar({
  initial,
  pending,
  tone = 0,
  className,
}: {
  initial: string;
  pending?: boolean;
  tone?: number;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        pending ? "bg-sun-soft text-muted ring-1 ring-line" : TONES[tone % TONES.length],
        className,
      )}
    >
      {initial}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line px-5 py-8 text-center">
      <p className="font-display text-lg font-medium">{title}</p>
      {children && <div className="mt-1 text-muted">{children}</div>}
    </div>
  );
}

export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay">{children}</p>;
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse pt-safe">
      <div className="mt-14 h-9 w-48 rounded-xl bg-line" />
      <div className="mt-3 h-5 w-32 rounded-lg bg-line/70" />
      <div className="mt-8 space-y-3">
        <div className="h-16 rounded-3xl bg-line/60" />
        <div className="h-16 rounded-3xl bg-line/60" />
        <div className="h-16 rounded-3xl bg-line/60" />
      </div>
    </div>
  );
}
