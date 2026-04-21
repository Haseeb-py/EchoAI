import Link from "next/link";
import type { UserRole } from "@/lib/auth";
import Sidebar from "@/components/dashboard/Sidebar";
import { protectedNavByRole } from "@/lib/navigation";

const roleCopy: Record<UserRole, { eyebrow: string; title: string; description: string }> = {
  agent: {
    eyebrow: "Agent Workspace",
    title: "Voice operations are online.",
    description: "Your session is authenticated and the agent console is available.",
  },
  supervisor: {
    eyebrow: "Supervisor Command",
    title: "Oversee live teams and intervention flows.",
    description: "Supervisor access is active. This lane is ready for queue insights, quality reviews, and escalation tooling.",
  },
  admin: {
    eyebrow: "Admin Control",
    title: "System governance unlocked.",
    description: "Administrator access is active. This lane is ready for permission management, audit layers, and platform controls.",
  },
};

export default function ProtectedLanding({ role }: { role: UserRole }) {
  const content = roleCopy[role];
  const navLinks = protectedNavByRole[role];
  const activeKey = role === "admin" ? "users" : "analytics";

  return (
    <div className="min-h-screen bg-[#070913] text-white">
      <div className="flex min-h-screen">
        <Sidebar activeKey={activeKey} />
        <div className="flex-1 px-6 py-10">
          <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[1120px] items-center">
            <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_20%_10%,rgba(132,118,255,0.18),transparent_32%),#0f121d] p-8 shadow-[0_30px_80px_rgba(4,5,10,0.55)]">
                <div className="mb-8 flex flex-wrap gap-3">
                  {navLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="inline-flex h-9 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/44">{content.eyebrow}</div>
                <h1 className="mt-4 max-w-[520px] font-headline text-[52px] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
                  {content.title}
                </h1>
                <p className="mt-5 max-w-[500px] text-[16px] leading-8 text-white/56">{content.description}</p>

                <div className="mt-10 flex flex-wrap gap-3">
                  <Link
                    href="/dashboard"
                    className="inline-flex h-11 items-center rounded-[12px] bg-[#b9b7ff] px-5 text-[13px] font-semibold tracking-[0.06em] text-[#252a4d] transition-colors hover:bg-[#cbcafc]"
                  >
                    Open Main Dashboard
                  </Link>
                  <Link
                    href="/unauthorized"
                    className="inline-flex h-11 items-center rounded-[12px] border border-white/10 bg-white/[0.03] px-5 text-[13px] font-semibold tracking-[0.06em] text-white/82 transition-colors hover:bg-white/[0.06]"
                  >
                    Review Access Rules
                  </Link>
                </div>
              </section>

              <section className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(25,26,35,0.98),rgba(17,18,26,0.98))] p-6 shadow-[0_30px_80px_rgba(4,5,10,0.55)]">
                <div className="rounded-[22px] border border-white/[0.05] bg-[#11131b] p-6">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">RBAC Snapshot</div>
                  <div className="mt-6 space-y-3">
                    <AccessRow label="/agent / /dashboard" allowed />
                    <AccessRow label="/supervisor" allowed={role === "supervisor" || role === "admin"} />
                    <AccessRow label="/admin" allowed={role === "admin"} />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccessRow({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <span className="text-[13px] text-white/72">{label}</span>
      <span
        className={[
          "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
          allowed ? "bg-[#213528] text-[#bff3cb]" : "bg-[#3b252d] text-[#ffd1db]",
        ].join(" ")}
      >
        {allowed ? "Allowed" : "Restricted"}
      </span>
    </div>
  );
}
