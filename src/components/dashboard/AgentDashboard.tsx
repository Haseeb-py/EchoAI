import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge, Card, SearchInput } from "@/components/ui/ui-components";
import Sidebar from "@/components/dashboard/Sidebar";
import {
  ArrowRight,
  AudioWaveform,
  Bell,
  MicOff,
  Pause,
  PhoneCall,
  Plus,
  UserRound,
} from "lucide-react";

const callControls = [
  {
    key: "pause",
    icon: <Pause size={18} strokeWidth={2.1} aria-hidden="true" />,
  },
  {
    key: "mute",
    icon: <MicOff size={18} strokeWidth={2.1} aria-hidden="true" />,
  },
  {
    key: "transfer",
    icon: (
      <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center" aria-hidden="true">
        <UserRound size={16} strokeWidth={2} />
        <ArrowRight size={10} strokeWidth={2.3} className="absolute -right-[4px] -top-[1px]" />
      </span>
    ),
  },
];

const logs = [
  { name: "Robert Chen", meta: "09:45 AM  ·  12M 30S", value: "+$450", warning: false },
  { name: "Elena Rodriguez", meta: "08:20 AM  ·  06M 12S", value: "Pending", warning: true },
  { name: "Mark Thompson", meta: "Yesterday  ·  14M 02S", value: "+$1,200", warning: false },
];

function Waveform() {
  const bars = [20, 34, 46, 58, 36, 72, 86, 62, 50, 76, 42, 64, 74, 54, 38, 68, 82, 44, 60, 30, 52, 66, 40];

  return (
    <div className="flex h-28 items-end gap-[5px]" aria-label="Live waveform">
      {bars.map((height, i) => {
        const active = i % 3 !== 0;
        return (
          <span
            key={`${height}-${i}`}
            className={active ? "bg-[#C893FF]" : "bg-[#7B82D6]"}
            style={{
              width: "3px",
              borderRadius: "999px",
              height: `${height}%`,
              opacity: active ? 0.95 : 0.72,
              boxShadow: active ? "0 0 9px rgba(200,147,255,0.28)" : "none",
            }}
          />
        );
      })}
    </div>
  );
}

function RingScore({ value }: { value: number }) {
  const radius = 62;
  const stroke = 10;
  const normalized = 2 * Math.PI * radius;
  const offset = normalized * (1 - value / 100);

  return (
    <div className="relative grid h-[210px] place-items-center">
      <svg width="170" height="170" viewBox="0 0 170 170" className="-rotate-90">
        <circle cx="85" cy="85" r={radius} stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} fill="none" />
        <circle
          cx="85"
          cy="85"
          r={radius}
          stroke="#B4B3FF"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={normalized}
          strokeDashoffset={offset}
          style={{ filter: "drop-shadow(0 0 8px rgba(180,179,255,0.45))", transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <div className="pointer-events-none absolute text-center">
        <div className="font-['Space_Grotesk'] text-[44px] font-semibold leading-none text-white">{value}%</div>
        <div className="mt-1 text-[11px] font-medium tracking-[0.2em] text-white/55">STABLE</div>
      </div>
    </div>
  );
}

export default function AgentDashboard() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#090A13] text-white">
      <div className="flex min-h-screen w-full bg-[#0D0F1A]">
        <Sidebar />

        <main className="flex-1">
          <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-5 py-3 md:px-6">
            <div className="w-full max-w-[250px]">
              <SearchInput value="" placeholder="Search leads..." readOnly />
            </div>

            <nav className="ml-1 flex items-center gap-5 text-[11px] font-semibold tracking-[0.17em] text-white/58">
              <Link href="/" className="text-white/48 transition-colors hover:text-white/95">HOME</Link>
              <Link href="/dashboard" className="text-white/95">DASHBOARD</Link>
              <Link href="/supervisor" className="text-white/48 transition-colors hover:text-white/95">SUPERVISOR</Link>
              <Link href="/admin" className="text-white/48 transition-colors hover:text-white/95">ADMIN</Link>
            </nav>

            <div className="ml-auto flex items-center gap-3 text-[11px] font-semibold tracking-[0.14em] text-white/58">
              <span className="inline-flex items-center gap-2 text-white/72">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B5B6FF] shadow-[0_0_8px_rgba(181,182,255,0.8)]" />
                AI STATUS: OPTIMAL
              </span>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-[9px] border border-white/10 bg-white/[0.03] text-white/75">
                <Bell size={15} strokeWidth={2} aria-hidden="true" />
              </button>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-[9px] border border-white/10 bg-white/[0.03] text-white/75">
                <AudioWaveform size={15} strokeWidth={2} aria-hidden="true" />
              </button>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-[9px] border border-white/10 bg-white/[0.03] text-white/75">
                <Plus size={15} strokeWidth={2} aria-hidden="true" />
              </button>
              <Button
                variant="outlined"
                size="sm"
                className="!h-8 !border-white/15 !bg-white/[0.03] !px-3.5 !text-[11px] !tracking-[0.11em]"
                leftIcon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                }
              >
                AI Command
              </Button>
            </div>
          </header>

          <section className="px-5 pb-5 pt-4 md:px-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.19em] text-white/45">SYSTEMS ONLINE</div>
                <h1 className="mt-1 text-[46px] font-semibold leading-[1.05] tracking-[-0.03em] text-white">Agent Dashboard</h1>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Card className="!rounded-[12px] !border-white/[0.06] !bg-[#141725] !p-3.5">
                  <div className="text-[9px] font-semibold tracking-[0.16em] text-white/45">SENTIMENT SCORE</div>
                  <div className="mt-1.5 text-[39px] font-semibold leading-none text-[#A9A9FF]">94</div>
                </Card>
                <Card className="!rounded-[12px] !border-white/[0.06] !bg-[#141725] !p-3.5">
                  <div className="text-[9px] font-semibold tracking-[0.16em] text-white/45">ACTIVE CALL TIME</div>
                  <div className="mt-1.5 text-[39px] font-semibold leading-none text-[#F4A8F2]">04:12:45</div>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
              <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=128&q=80"
                      alt="Sarah J. Miller"
                      className="h-12 w-12 rounded-[11px] object-cover"
                    />
                    <div>
                      <div className="text-[26px] font-semibold leading-none tracking-[-0.01em] text-white">Sarah J. Miller</div>
                      <div className="mt-1 text-[12px] text-white/55">Lead ID: #9942  •  Enterprise Tier</div>
                    </div>
                  </div>
                  <Badge color="danger" className="!bg-[#5A3346] !text-[#FFC4D8]">LIVE CALL</Badge>
                </div>

                <div className="grid min-h-[262px] place-items-center py-4">
                  <Waveform />
                </div>

                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {callControls.map((control) => (
                      <button
                        key={control.key}
                        type="button"
                        className="grid h-11 w-11 place-items-center rounded-[9px] border border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.08]"
                      >
                        {control.icon}
                      </button>
                    ))}
                  </div>

                  <Button
                    size="md"
                    className="!h-11 !rounded-[9px] !bg-[#F5AFAF] !px-7 !text-[13px] !font-semibold !tracking-[0.08em] !text-[#3B1015] hover:!bg-[#f8bcbc]"
                    leftIcon={<PhoneCall size={14} strokeWidth={2.2} aria-hidden="true" />}
                  >
                    END SESSION
                  </Button>
                </div>
              </Card>

              <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-5">
                <div className="text-center text-[10px] font-semibold tracking-[0.18em] text-white/45">REAL-TIME EMOTION HEALTH</div>
                <RingScore value={75} />
                <div className="-mt-1 flex items-center justify-center gap-2">
                  <Badge color="primary" className="!rounded-full !px-3 !py-1 !text-[10px] !tracking-[0.1em]">POSITIVE TONE</Badge>
                  <Badge color="neutral" className="!rounded-full !px-3 !py-1 !text-[10px] !tracking-[0.1em]">NO FRICTION</Badge>
                </div>
              </Card>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr_1.1fr]">
              <Card className="relative !rounded-[14px] !border-white/[0.06] !bg-[#111420] !p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-[26px] font-semibold tracking-[-0.02em] text-white">Today&apos;s Logs</div>
                  <Badge color="neutral" className="!text-[9px] !tracking-[0.13em]">12 COMPLETED</Badge>
                </div>

                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.name} className="flex items-center gap-3 rounded-[10px] border border-white/[0.05] bg-white/[0.01] px-3 py-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-[7px] bg-white/5 text-white/55">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-medium text-white/90">{log.name}</div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-[0.09em] text-white/40">{log.meta}</div>
                      </div>
                      <div className={log.warning ? "text-[18px] font-semibold text-[#F9B851]" : "text-[18px] font-semibold text-[#B7B8FF]"}>{log.value}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="!rounded-[14px] !border-white/[0.06] !bg-[#111420] !p-4">
                <div className="text-[10px] font-semibold tracking-[0.15em] text-white/45">CONVERSION TREND</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="text-[40px] font-semibold leading-none text-white">24.8%</div>
                  <Badge color="primary" className="!text-[10px]">+2.4% vs last week</Badge>
                </div>
                <div className="mt-10 flex h-[84px] items-end justify-between gap-2">
                  {[16, 22, 29, 41, 53, 66, 58].map((h, i) => (
                    <div
                      key={`${h}-${i}`}
                      className="w-full rounded-t-[3px] bg-[#AFAEFF]"
                      style={{
                        height: `${h}%`,
                        opacity: i > 3 ? 0.95 : 0.35,
                        boxShadow: i > 4 ? "0 0 10px rgba(175,174,255,0.3)" : "none",
                      }}
                    />
                  ))}
                </div>
              </Card>

              <Card className="!rounded-[14px] !border-white/[0.06] !bg-[#111420] !p-4">
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-semibold tracking-[0.15em] text-white/45">NEXT LEAD PRIORITY</div>
                    <div className="mt-1 text-[33px] font-semibold leading-tight tracking-[-0.02em] text-white">Acme Global Ltd</div>
                  </div>
                  <Badge color="tertiary" className="!text-[9px] !tracking-[0.1em]">HOT LEAD</Badge>
                </div>
                <div className="mt-9 flex items-center gap-2 text-[12px] text-white/56">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-white/70">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="8" r="3" fill="currentColor" />
                      <path d="M6 20a6 6 0 0 1 12 0" fill="currentColor" />
                    </svg>
                  </span>
                  David Henderson (CTO)
                </div>

                <button
                  type="button"
                  className="mt-10 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#AFAEFF] text-[12px] font-semibold tracking-[0.12em] text-[#1F2450] hover:bg-[#bfbeff]"
                >
                  <PhoneCall size={14} strokeWidth={2.2} aria-hidden="true" />
                  START DIALING
                </button>

                <button
                  type="button"
                  className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-[12px] border border-[#F4A7FA]/35 bg-[#F2A7FA]/20 text-[#FFCBFF] shadow-[0_0_18px_rgba(242,167,250,0.35)]"
                  aria-label="Open magic actions"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Zm6 12 .9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15ZM6 15l.9 2.1L9 18l-2.1.9L6 21l-.9-2.1L3 18l2.1-.9L6 15Z" fill="currentColor" />
                  </svg>
                </button>
              </Card>
            </div>
          </section>
        </main>
      </div>

      <div className="block px-4 py-3 text-center text-[11px] tracking-[0.12em] text-white/45 lg:hidden">
        HORIZONTAL SCROLL ENABLED TO PRESERVE PIXEL LAYOUT ON SMALL SCREENS
      </div>
    </div>
  );
}
