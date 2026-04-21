import type { ReactNode } from "react";
import Link from "next/link";
import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

const shellStats = [
  { value: "99.9%", label: "Prime SLA" },
  { value: "AES-256", label: "Encryption" },
];

const shellSignals = ["Terminals", "Status", "Node A-882"];

export default function AuthShell({
  badge,
  title,
  description,
  aside,
  children,
}: {
  badge: string;
  title: ReactNode;
  description: string;
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070913] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(129,118,255,0.18),transparent_34%),radial-gradient(circle_at_84%_84%,rgba(242,164,255,0.09),transparent_28%),radial-gradient(circle_at_78%_26%,rgba(89,210,255,0.1),transparent_30%)]" />
      <div className="absolute left-[-8%] top-[8%] h-[460px] w-[460px] rounded-full bg-[#7658ff]/10 blur-[140px]" />
      <div className="absolute bottom-[-10%] right-[6%] h-[380px] w-[380px] rounded-full bg-[#f3ab81]/8 blur-[150px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1340px] flex-col px-6 py-6 lg:px-10">
        <header className="flex items-center justify-start py-4">
          <Link
            href="/"
            className="font-body text-[14px] font-semibold tracking-tight text-[#d9dcff] transition-colors hover:text-white"
          >
            EchoAI
          </Link>
        </header>

        <div className="flex flex-1 items-start">
          <div className="grid w-full gap-12 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:pt-10">
            <section className="relative pt-4 lg:pt-6">
              <div className="absolute left-[18px] top-[52px] hidden h-[240px] w-[620px] border-t border-dashed border-white/10 lg:block" />
              <div className="absolute left-[126px] top-[138px] hidden h-[170px] w-[510px] rounded-[100%] border border-dashed border-white/[0.06] lg:block" />

              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72">
                <span className="h-2 w-2 rounded-full bg-[#b6b7ff] shadow-[0_0_10px_rgba(182,183,255,0.8)]" />
                {badge}
              </span>

              <h1 className="mt-7 max-w-[560px] font-headline text-[58px] font-semibold leading-[0.94] tracking-[-0.04em] text-white sm:text-[74px]">
                {title}
              </h1>

              <p className="mt-6 max-w-[460px] text-[18px] leading-8 text-white/58">{description}</p>

              <div className="mt-10 flex flex-wrap gap-10">
                {shellStats.map((stat, index) => (
                  <div key={stat.label}>
                    <div className={index === 0 ? "text-[30px] font-semibold text-[#f0adff]" : "text-[30px] font-semibold text-[#f6c56f]"}>
                      {stat.value}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/38">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 grid max-w-[520px] gap-3 sm:grid-cols-3">
                <SignalCard
                  icon={<ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />}
                  label="Privilege-aware"
                />
                <SignalCard
                  icon={<LockKeyhole size={16} strokeWidth={2} aria-hidden="true" />}
                  label="JWT session"
                />
                <SignalCard
                  icon={<Sparkles size={16} strokeWidth={2} aria-hidden="true" />}
                  label="Operator-first"
                />
              </div>
            </section>

            <section className="flex justify-center self-start lg:justify-end">
              <div className="w-full max-w-[460px] pt-4 lg:pt-6">
                {children}
                <div className="mt-6 flex items-center justify-center gap-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/28">
                  {shellSignals.map((signal) => (
                    <span key={signal}>{signal}</span>
                  ))}
                </div>
                <div className="mt-4 text-center text-[11px] leading-6 text-white/40">{aside}</div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalCard({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 py-4 backdrop-blur-sm">
      <div className="mb-3 inline-flex rounded-[10px] border border-white/10 bg-white/[0.04] p-2 text-[#c8cbff]">
        {icon}
      </div>
      <p className="text-[12px] font-medium tracking-[0.08em] text-white/74">{label}</p>
    </div>
  );
}
