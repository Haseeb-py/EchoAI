"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Radio, RefreshCw, ShieldAlert } from "lucide-react";
import { SupervisorScreenShell } from "@/components/supervisor/SupervisorScreenShell";
import { Badge, Card, ProgressBar } from "@/components/ui/ui-components";
import { apiGet } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";
import { useSupervisorRefreshSeconds } from "@/components/supervisor/useSupervisorRefreshSeconds";

type CampaignMonitor = { campaign_id: string; name: string; status: string; total_calls: number; active_calls: number; unresolved_alerts: number; critical_alerts: number; risk_score: number; updated_at: string };

export default function CampaignMonitoringPage() {
  const [campaigns, setCampaigns] = useState<CampaignMonitor[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("Loading persisted campaign health.");
  const refreshSeconds = useSupervisorRefreshSeconds();

  const load = useCallback(async () => {
    try {
      const data = await apiGet<CampaignMonitor[]>("/api/supervisor/campaigns", getStoredAuthToken());
      setCampaigns(data);
      setMessage(data.length ? "Campaign load and risk are calculated from active calls and unresolved alerts." : "No persisted campaigns are available yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load campaign monitoring data.");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), refreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [load, refreshSeconds]);

  const filtered = useMemo(() => campaigns.filter((campaign) => statusFilter === "all" || campaign.status === statusFilter).sort((a, b) => b.risk_score - a.risk_score), [campaigns, statusFilter]);
  const activeCalls = campaigns.reduce((sum, campaign) => sum + campaign.active_calls, 0);
  const unresolved = campaigns.reduce((sum, campaign) => sum + campaign.unresolved_alerts, 0);

  return <SupervisorScreenShell activeKey="campaigns" contextLabel="Campaigns" eyebrow="Supervisor / Campaign Health" title="Campaign Monitoring" description="Backend-synced lifecycle, live load, and alert risk. Refreshes every five seconds.">
    <p className="mb-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>
    <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}><option value="all">All lifecycle states</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="archived">Archived</option><option value="draft">Draft</option></select><Link href="/supervisor/activity" className={buttonClass}><Radio size={14} /> {activeCalls} live calls</Link><button type="button" onClick={() => void load()} className={buttonClass}><RefreshCw size={14} /> Refresh</button></div>
    <div className="mb-4 grid gap-3 md:grid-cols-2"><Card className="!rounded-[15px] !border-white/[0.06] !bg-[#111420] !p-4"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Unresolved alerts</div><div className="mt-2 flex items-center gap-2 text-[27px] font-semibold text-[#f6c56f]"><ShieldAlert size={22} /> {unresolved}</div></Card><Card className="!rounded-[15px] !border-white/[0.06] !bg-[#111420] !p-4"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Monitored campaigns</div><div className="mt-2 text-[27px] font-semibold text-white">{campaigns.length}</div></Card></div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{filtered.map((campaign) => <Card key={campaign.campaign_id} className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-[19px] font-semibold text-white">{campaign.name}</h2><div className="mt-1 text-[12px] text-white/50">{campaign.total_calls} retained calls / {campaign.active_calls} active now</div></div><Badge color={campaign.status === "active" ? "success" : campaign.status === "archived" ? "neutral" : "primary"}>{campaign.status.toUpperCase()}</Badge></div><div className="mt-4 grid grid-cols-2 gap-2 text-[12px] text-white/62"><div className={mini}>Unresolved alerts: <span className="text-white">{campaign.unresolved_alerts}</span></div><div className={mini}>Critical: <span className="text-white">{campaign.critical_alerts}</span></div></div><ProgressBar className="mt-4" value={campaign.risk_score} color={campaign.risk_score >= 50 ? "tertiary" : "primary"} label="Alert-derived risk" showValue /><div className="mt-4 flex gap-2"><Link href="/supervisor/activity" className={buttonClass}>View live calls</Link><Link href="/supervisor/escalations" className={buttonClass}><AlertTriangle size={14} /> Review alerts</Link></div></Card>)}{!filtered.length ? <div className={empty}>No campaigns match this lifecycle filter.</div> : null}</div>
  </SupervisorScreenShell>;
}

const inputClass = "h-[42px] rounded-[10px] border border-white/[0.08] bg-[#191c28] px-3 text-[13px] text-white/84 outline-none focus:border-[#b9b7ff]/40";
const buttonClass = "inline-flex h-[42px] items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const mini = "rounded-[11px] border border-white/[0.06] bg-white/[0.02] px-3 py-2";
const empty = "rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62";
