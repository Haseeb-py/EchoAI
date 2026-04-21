import Link from "next/link";
import { landingNavLinks } from "@/lib/navigation";
import {
  ArrowRight,
  AudioWaveform,
  Bell,
  Bot,
  Check,
  Clock3,
  Database,
  Gauge,
  Lock,
  MessageSquare,
  PhoneIncoming,
  Play,
  ShieldCheck,
  UserCircle2,
  Zap,
} from "lucide-react";

const brandLogos = ["VOXON", "LUMINA", "NEURALIS", "SYNTHETIX", "CORE_AI"];

const capabilityBullets = [
  "Dynamic Objection Handling",
  "Zero-Latency Natural Voice",
  "Automatic CRM Field Updating",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070913] text-white">
      <div className="relative overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(circle_at_24%_20%,rgba(133,113,255,0.18),transparent_52%),radial-gradient(circle_at_78%_18%,rgba(72,197,255,0.14),transparent_45%),#070913]">
        <header className="mx-auto flex w-full max-w-[1280px] items-center gap-5 px-8 py-4">
          <Link href="/" className="text-[14px] font-semibold tracking-tight text-[#d9dcff]">
            EchoAI
          </Link>

          <nav className="flex items-center gap-5 text-[10px] font-semibold tracking-[0.14em] text-white/70">
            {landingNavLinks.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="mr-2 text-[9px] font-semibold tracking-[0.16em] text-white/70">STATUS</span>
            <button type="button" className="grid h-8 w-8 place-items-center rounded-[8px] border border-white/10 bg-white/[0.02] text-white/75">
              <Bell size={14} strokeWidth={2.1} aria-hidden="true" />
            </button>
            <button type="button" className="grid h-8 w-8 place-items-center rounded-[8px] border border-white/10 bg-white/[0.02] text-white/75">
              <AudioWaveform size={14} strokeWidth={2.1} aria-hidden="true" />
            </button>
            <button type="button" className="grid h-8 w-8 place-items-center rounded-full border border-[#8fdde0]/45 bg-[#7ad3d8]/26 text-[#d8fbfd]">
              <UserCircle2 size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </header>
        <section className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-10 px-8 pb-14 pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch lg:pb-20 lg:pt-16">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-[9px] font-semibold tracking-[0.16em] text-white/75">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b3b5ff]" />
              ENTERPRISE READY v3.0
            </span>

            <h1 className="mt-5 max-w-[560px] font-headline text-[70px] font-semibold leading-[0.95] tracking-[-0.03em] text-white sm:text-[86px]">
              Voice Intelligence
              <br />
              for BPO Elite.
            </h1>

            <p className="mt-5 max-w-[470px] text-[14px] leading-6 text-white/62">
              Automate complex sales dialogues with human-aware AI that learns, adapts, and closes deals at 10x the scale.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#b4b3ff] px-5 text-[11px] font-semibold tracking-[0.06em] text-[#1b2144] shadow-[0_0_26px_rgba(176,175,255,0.4)]"
              >
                Start Scaling Now
                <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
              </Link>

              <Link
                href="/login"
                className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-white/14 bg-white/[0.02] px-4 text-[11px] font-semibold tracking-[0.06em] text-white/88"
              >
                <Play size={13} strokeWidth={2.2} aria-hidden="true" />
                Operator Login
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] lg:h-[540px]">
            <div className="h-full rounded-[18px] border border-white/10 bg-[#0f1220] p-3 shadow-[0_20px_70px_rgba(10,12,26,0.7)]">
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="text-[9px] font-semibold tracking-[0.14em] text-white/70">LIVE PULSE</span>
                <Zap size={12} strokeWidth={2.2} className="text-white/70" aria-hidden="true" />
              </div>

              <div className="relative h-[calc(100%-32px)] overflow-hidden rounded-[14px] border border-white/8 bg-[radial-gradient(circle_at_52%_50%,rgba(63,209,255,0.28),transparent_48%),radial-gradient(circle_at_50%_50%,rgba(98,224,255,0.24),transparent_62%),#0c101f] px-6 py-11 text-center">
                <div className="absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(255,255,255,0.06)_95%),linear-gradient(90deg,transparent_95%,rgba(255,255,255,0.06)_95%)] bg-[size:16px_16px] opacity-30" />
                <span className="absolute left-1/2 top-1/2 z-10 inline-flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[12px] border border-[#6de6ff]/45 bg-[#68e4ff]/14 font-headline text-[48px] font-bold leading-none text-[#7ee8ff] shadow-[0_0_32px_rgba(104,228,255,0.45)]">
                  AI
                </span>
                <div className="absolute bottom-3 left-3">
                  <AudioWaveform size={30} strokeWidth={1.8} className="text-[#bc8eff]" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="border-b border-white/[0.05] bg-[#080b16]">
        <div className="mx-auto w-full max-w-[1280px] px-8 py-10">
          <div className="text-center text-[8px] font-semibold tracking-[0.22em] text-white/45">TRUSTED BY GLOBAL INFRASTRUCTURE GIANTS</div>
          <div className="mt-6 grid grid-cols-2 gap-4 text-center text-[16px] font-semibold tracking-wide text-white/45 sm:grid-cols-5">
            {brandLogos.map((logo) => (
              <div key={logo}>{logo}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.05] bg-[radial-gradient(circle_at_32%_10%,rgba(143,124,255,0.11),transparent_44%),#070b16]">
        <div className="mx-auto w-full max-w-[1280px] px-8 py-16 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h2 className="max-w-[620px] font-headline text-[50px] font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-[60px]">
                Designed for the
                <span className="bg-[linear-gradient(135deg,#f3a8ff,#8ca4ff)] bg-clip-text text-transparent"> High-Frequency </span>
                Sales Engine.
              </h2>
              <p className="mt-4 max-w-[510px] text-[13px] leading-6 text-white/58">
                We did not just build a chatbot. We built a digital sovereign capable of handling the entire customer lifecycle.
              </p>
            </div>
            <button
              type="button"
              className="text-[10px] font-semibold tracking-[0.14em] text-[#aeb2ff] underline decoration-[#8e96ff]/60 underline-offset-[4px] hover:text-[#c2c6ff]"
            >
              VIEW CAPABILITIES
            </button>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-[18px] border border-white/[0.08] bg-[#101523] p-5 md:col-span-2">
              <div>
                <ShieldCheck size={16} strokeWidth={2.2} className="text-[#b6b3ff]" aria-hidden="true" />
                <h3 className="mt-4 font-headline text-[31px] font-semibold tracking-[-0.02em] text-white">Sentiment-Aware Logic</h3>
                <p className="mt-3 max-w-[520px] text-[12px] leading-5 text-white/55">
                  Our AI detects hesitation, excitement, and skepticism in real-time, pivoting the pitch exactly when a human closer would.
                </p>
              </div>
              <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-white/68">
                Used by 400+ VPs
              </div>
            </article>

            <article className="rounded-[18px] border border-white/[0.08] bg-[#101523] p-5">
              <Gauge size={16} strokeWidth={2.2} className="text-[#f3a8ff]" aria-hidden="true" />
              <h3 className="mt-4 font-headline text-[26px] font-semibold tracking-[-0.02em] text-white">Sub-50ms Latency</h3>
              <p className="mt-3 text-[12px] leading-5 text-white/55">
                Eliminate the awkward pause. Calls feel instantaneous, fluid, and unmistakably human.
              </p>
            </article>

            <article className="rounded-[18px] border border-white/[0.08] bg-[#101523] p-5">
              <Lock size={16} strokeWidth={2.2} className="text-[#ffca73]" aria-hidden="true" />
              <h3 className="mt-4 font-headline text-[26px] font-semibold tracking-[-0.02em] text-white">Enterprise Shield</h3>
              <p className="mt-3 text-[12px] leading-5 text-white/55">
                SOC2 Type II compliant. Your data stays yours, encrypted and locked in our secure cloud.
              </p>
            </article>

            <article className="rounded-[18px] border border-white/[0.08] bg-[radial-gradient(circle_at_78%_74%,rgba(162,178,255,0.24),transparent_44%),#101523] p-5 md:col-span-2">
              <Database size={16} strokeWidth={2.2} className="text-[#b8b6ff]" aria-hidden="true" />
              <h3 className="mt-4 font-headline text-[31px] font-semibold tracking-[-0.02em] text-white">Infinite Knowledge Graph</h3>
              <p className="mt-3 max-w-[510px] text-[12px] leading-5 text-white/55">
                Upload your entire product catalog and CRM history. The AI becomes a subject matter expert in seconds.
              </p>
              <Link href="/signup" className="mt-6 inline-flex h-8 items-center rounded-[7px] border border-white/12 bg-white/[0.02] px-3 text-[10px] font-semibold tracking-[0.12em] text-white/86">
                EXPLORE INTEGRATION
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.05] bg-[#070b15]">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-8 px-8 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12">
          <div className="rounded-[24px] border border-[#8f77ff]/45 bg-[#101523] p-4 shadow-[0_0_0_1px_rgba(143,119,255,0.16),0_0_42px_rgba(143,119,255,0.24)]">
            <div className="rounded-[14px] bg-[linear-gradient(90deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-[6px] bg-white/[0.06] text-white/65">
                    <PhoneIncoming size={12} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[8px] font-semibold tracking-[0.12em] text-white/58">ACTIVE SESSION</p>
                    <p className="mt-1 text-[11px] font-semibold text-white/90">Inbound Lead #98421</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[7px] font-semibold tracking-[0.11em] text-[#ffd36f]">INTERACTION CLOCK</p>
                  <p className="mt-1 font-headline text-[20px] font-semibold text-white">03:42</p>
                </div>
              </div>

              <div className="mt-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-[5px] bg-white/[0.04] text-white/52">
                    <Clock3 size={11} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <div className="w-full rounded-[10px] bg-white/[0.03] px-3 py-2 text-[11px] text-white/78">
                    I need a lower monthly fee around 40% reduction to close this quarter.
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-[5px] bg-[#272c46] text-[#aeb8ff]">
                    <MessageSquare size={11} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <div className="w-full rounded-[10px] bg-[#232743] px-3 py-2 text-[11px] text-white/92">
                    I completely understand. Most CFO at your stage ask this first. We can structure a pilot for 90 days, would that help?
                    <span className="ml-2 inline-flex h-4 items-center rounded-[5px] border border-[#8590ff]/35 bg-[#757fff]/18 px-1.5 text-[8px] font-semibold tracking-[0.08em] text-[#d9ddff]">
                      AI
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-[5px] bg-white/[0.04] text-white/52">
                    <Bot size={11} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <div className="w-full rounded-[10px] bg-white/[0.03] px-3 py-2 text-[11px] text-white/78">
                    That actually sounds reasonable. Tell me more about the pilot.
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[8px] font-semibold tracking-[0.11em] text-white/58">
                <span>SENTIMENT MAP</span>
                <span className="text-white/86">Positive Shift Detected</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-[linear-gradient(90deg,#ff9b6b_0%,#ffd66a_50%,#85f5a8_100%)]" />
            </div>
          </div>

          <div className="lg:flex lg:min-h-[452px] lg:flex-col lg:justify-center">
            <div className="text-[9px] font-semibold tracking-[0.16em] text-white/58">LIVE INTERACTION DEMO</div>
            <h2 className="mt-3 max-w-[510px] font-headline text-[56px] font-semibold leading-[0.98] tracking-[-0.03em] text-white">
              Hear the difference
              <span className="bg-[linear-gradient(135deg,#f3a8ff,#9eb0ff)] bg-clip-text text-transparent"> Intelligence </span>
              makes.
            </h2>
            <p className="mt-4 max-w-[500px] text-[13px] leading-6 text-white/60">
              Traditional IVR irritates. Our AI converses. It understands nuance, pauses for effect, and builds genuine rapport with every lead.
            </p>

            <ul className="mt-7 space-y-3">
              {capabilityBullets.map((item) => (
                <li key={item} className="flex items-center gap-3 text-[13px] text-white/86">
                  <span className="grid h-5 w-5 place-items-center rounded-full border border-[#8ea0ff]/40 bg-[#8ea0ff]/14 text-[#d2d7ff]">
                    <Check size={12} strokeWidth={2.4} aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.05] bg-[#060911]">
        <div className="mx-auto w-full max-w-[1280px] px-8 py-16">
          <div className="rounded-[26px] border border-white/[0.08] bg-[radial-gradient(circle_at_50%_35%,rgba(148,142,255,0.16),transparent_55%),#101522] px-8 py-14 text-center">
            <h2 className="mx-auto max-w-[670px] font-headline text-[52px] font-semibold leading-[1.03] tracking-[-0.03em] text-white">
              Ready to de-risk your
              <span className="bg-[linear-gradient(135deg,#f2a8ff,#98adff)] bg-clip-text text-transparent"> revenue </span>
              engine?
            </h2>
            <p className="mx-auto mt-4 max-w-[540px] text-[13px] leading-6 text-white/58">
              Join the elite BPOs already seeing 300% ROI. Deploy your first AI voice agent in under 48 hours.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-10 items-center rounded-[9px] bg-[#b4b3ff] px-5 text-[11px] font-semibold tracking-[0.08em] text-[#1a2344] shadow-[0_0_28px_rgba(180,179,255,0.42)]"
              >
                Book an Executive Demo
              </Link>
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-[9px] border border-white/12 bg-white/[0.02] px-5 text-[11px] font-semibold tracking-[0.08em] text-white/88"
              >
                View Access
              </Link>
            </div>

            <p className="mt-8 text-[8px] font-semibold tracking-[0.18em] text-white/38">NO CREDIT CARD REQUIRED. SCALABLE PRICING MODELS.</p>
          </div>
        </div>
      </section>

      <footer className="bg-[#06080f]">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-2 gap-8 px-8 py-12 text-white/70 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr]">
          <div className="col-span-2 lg:col-span-1">
            <div className="text-[18px] font-semibold tracking-tight text-[#d9dcff]">EchoAI</div>
            <p className="mt-4 max-w-[260px] text-[12px] leading-5 text-white/52">
              The premier voice intelligence layer for high-performance sales organizations. Engineered for speed, security, and conversion.
            </p>
            <div className="mt-5 flex gap-2">
              <span className="h-6 w-6 rounded-full border border-white/12 bg-white/[0.02]" />
              <span className="h-6 w-6 rounded-full border border-white/12 bg-white/[0.02]" />
            </div>
          </div>

          <FooterCol title="PLATFORM" links={["Intelligence Engine", "Voice Lab", "Integrations", "Security"]} />
          <FooterCol title="COMPANY" links={["About Us", "Customers", "Careers", "Blog"]} />
          <FooterCol title="LEGAL" links={["Privacy", "Terms", "Cookie Policy"]} />

          <div className="col-span-2 flex items-end justify-end lg:col-span-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.02] px-3 py-1 text-[8px] font-semibold tracking-[0.12em] text-white/65">
              <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
              NETWORK SIGNAL OPERATIONAL
            </span>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between border-t border-white/[0.06] px-8 py-4 text-[9px] font-medium tracking-[0.1em] text-white/35">
          <span>© 2026 ECHOAI TECHNOLOGIES INC. ALL RIGHTS RESERVED.</span>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="text-[9px] font-semibold tracking-[0.16em] text-white/48">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-[12px] text-white/65">
        {links.map((link) => (
          <li key={link}>
            <button type="button" className="font-body hover:text-white">
              {link}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
