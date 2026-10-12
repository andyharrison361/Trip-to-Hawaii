import { ToastProvider } from "@/components/toast";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <ToastProvider>
      <main className="pt-safe mx-auto max-w-xl px-5 pb-28">{children}</main>
    </ToastProvider>
  );
}
