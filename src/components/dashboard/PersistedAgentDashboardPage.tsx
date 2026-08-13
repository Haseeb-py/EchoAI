"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Clock3, Megaphone, Radio, RefreshCw } from "lucide-react";
import { AgentScreenShell } from "@/components/dashboard/AgentScreenShell";
import { Badge, Card } from "@/components/ui/ui-components";
import { apiGet } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

type Campaign = { id: string; name: string; product: string; audience: string; goal: string; status: string };
type Call = { id: string; campaign_name: string; lead_name: string; status: string; outcome: string | null; summary: string; started_at: string; completed_at: string | null; latest_turn: { transcript: string } | null; escalation: { severity: string; reason: string } | null };

export default function PersistedAgentDashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCalls, setActiveCalls] = useState<Call[]>([]);
  const [completedCalls, setCompletedCalls] = useState<Call[]>([]);
  const [message, setMessage] = useState("Loading persisted agent operations.");

  const load = async () => {
    try {
      const token = getStoredAuthToken();
      const [nextCampaigns, nextActive, nextCompleted] = await Promise.all([
        apiGet<Campaign[]>("/api/agent/campaigns", token),
        apiGet<Call[]>("/api/calls?status_filter=active", token),
        apiGet<Call[]>("/api/calls?status_filter=completed", token),
      ]);
      setCampaigns(nextCampaigns);
      setActiveCalls(nextActive);
      setCompletedCalls(nextCompleted);
      setMessage("Agent overview is synced with persisted campaigns and call records.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load agent operations.");
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  return <AgentScreenShell activeKey="dashboard" contextLabel="" eyebrow="Agent / Home" title="Agent Dashboard" description="Live operational context from active campaigns, temporary voice calls, and retained post-call analysis.">
    <div className="mb-4 flex justify-end"><button type="button" onClick={() => void load()} className={buttonClass}><RefreshCw size={14} /> Refresh</button></div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><Stat label="Active Campaigns" value={campaigns.length} accent="text-[#8fdde0]" icon={<Megaphone size={17} />} /><Stat label="Live Calls" value={activeCalls.length} accent="text-[#b9b7ff]" icon={<Radio size={17} />} /><Stat label="Completed Calls" value={completedCalls.length} accent="text-[#a7f3c4]" icon={<Clock3 size={17} />} /></div>
    <p className="mt-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]"><Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Available Work</div><h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Active campaigns</h2></div><Link href="/dashboard/live" className={buttonClass}>Open voice lab</Link></div><div className="mt-4 space-y-3">{campaigns.map((campaign) => <div key={campaign.id} className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[16px] font-semibold text-white">{campaign.name}</div><div className="mt-1 text-[12px] text-white/50">{campaign.product} / {campaign.audience}</div></div><Badge color="success">ACTIVE</Badge></div><div className="mt-3 text-[12px] leading-5 text-white/58">{campaign.goal || "No campaign goal supplied."}</div></div>)}{!campaigns.length ? <div className={empty}>No active campaigns are available. An admin must activate a campaign before calls can begin.</div> : null}</div></Card>
      <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Call Activity</div><h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Live and recent</h2></div><Link href="/dashboard/history" className={buttonClass}>Open history</Link></div><div className="mt-4 space-y-3">{activeCalls.slice(0, 3).map((call) => <CallRow key={call.id} call={call} live />)}{!activeCalls.length && completedCalls.slice(0, 3).map((call) => <CallRow key={call.id} call={call} />)}{!activeCalls.length && !completedCalls.length ? <div className={empty}>Start a temporary voice call to create the first persisted operational record.</div> : null}</div></Card></div>
  </AgentScreenShell>;
}

function Stat({ label, value, accent, icon }: { label: string; value: number; accent: string; icon: ReactNode }) { return <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4"><div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42"><span>{label}</span><span className={accent}>{icon}</span></div><div className={`mt-3 font-headline text-[42px] font-semibold leading-none tracking-[-0.04em] ${accent}`}>{value}</div></Card>; }
function CallRow({ call, live = false }: { call: Call; live?: boolean }) { return <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[15px] font-semibold text-white">{call.lead_name}</div><div className="mt-1 text-[12px] text-white/48">{call.campaign_name}</div></div><Badge color={live ? (call.escalation ? "tertiary" : "success") : "primary"}>{live ? call.escalation ? "AT RISK" : "LIVE" : call.outcome || "COMPLETED"}</Badge></div><div className="mt-3 text-[12px] leading-5 text-white/58">{live ? call.latest_turn?.transcript || "Awaiting the first transcript turn." : call.summary || "Analysis is being prepared."}</div></div>; }
const buttonClass = "inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const empty = "rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62";
