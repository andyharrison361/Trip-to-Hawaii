import { Suspense } from "react";
import { BottomNav, BottomNavView } from "@/components/bottom-nav";
import { QuickAdd } from "@/components/quick-add";
import { ToastProvider } from "@/components/toast";
import { keywordsFor } from "@/lib/catalog";
import { requireHousehold } from "@/lib/session";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <ToastProvider>
      {/* Planner pages use the full width on a computer; the (page) group narrows forms and lists. */}
      <div className="lg:pl-60">
        <div className="mx-auto max-w-xl px-4 pb-36 lg:max-w-6xl lg:px-10 lg:pb-16">{children}</div>
      </div>
      <Suspense fallback={<BottomNavView pathname={null} />}>
        <BottomNav />
      </Suspense>
      <Suspense fallback={null}>
        <QuickAddLoader />
      </Suspense>
    </ToastProvider>
  );
}

async function QuickAddLoader() {
  const { ctx, snap } = await requireHousehold();
  return (
    <QuickAdd
      currentUserId={ctx.userId}
      timezone={snap.household.timezone}
      members={snap.members.map((m) => ({ id: m.id, firstName: m.firstName, pending: m.pending }))}
      kids={snap.kids.map((k) => ({ id: k.id, name: k.name, color: k.color }))}
      areas={snap.areas.map((a) => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        ownerId: a.owner_id,
        keywords: keywordsFor(a.template_key),
      }))}
    />
  );
}
