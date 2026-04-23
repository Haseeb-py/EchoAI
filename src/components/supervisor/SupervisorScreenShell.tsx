import { ReactNode } from "react";
import { SupervisorHeader, SupervisorSidebar } from "@/components/supervisor/SupervisorNavigation";
import { SupervisorLiveCallEngine } from "@/components/supervisor/live-calls";

type SupervisorKey = "overview" | "activity" | "escalations" | "performance" | "campaigns" | "alerts" | "settings";

export function SupervisorScreenShell({
  activeKey,
  contextLabel,
  eyebrow,
  title,
  description,
  children,
}: {
  activeKey: SupervisorKey;
  contextLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080A13] text-white">
      <div className="flex min-h-screen bg-[radial-gradient(circle_at_24%_12%,rgba(118,107,255,0.14),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(143,221,224,0.1),transparent_30%),#0D0F1A]">
        <SupervisorSidebar activeKey={activeKey} />
        <SupervisorLiveCallEngine />
        <main className="flex-1">
          <SupervisorHeader contextLabel={contextLabel} activeKey={activeKey} />
          <section className="px-5 pb-8 pt-5 md:px-6">
            <div className="mb-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{eyebrow}</div>
              <h1 className="mt-2 max-w-[860px] font-headline text-[50px] font-semibold leading-[0.98] tracking-[-0.04em] text-white">{title}</h1>
              <p className="mt-4 max-w-[760px] text-[14px] leading-7 text-white/56">{description}</p>
            </div>
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
