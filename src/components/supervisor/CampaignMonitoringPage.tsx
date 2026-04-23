"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Eye } from "lucide-react";
import { SupervisorScreenShell } from "@/components/supervisor/SupervisorScreenShell";
import { Badge, Card, ProgressBar } from "@/components/ui/ui-components";
import {
  createSupervisorAlert,
  createSupervisorEscalation,
  readSupervisorAlerts,
  readSupervisorCampaignMonitor,
  readSupervisorEscalations,
  writeSupervisorAlerts,
  writeSupervisorCampaignMonitor,
  writeSupervisorEscalations,
  type CampaignMonitorItem,
} from "@/lib/supervisor-state";

export default function CampaignMonitoringPage() {
  const [campaigns, setCampaigns] = useState(readSupervisorCampaignMonitor);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "watch" | "paused">("all");
  const [watchOnly, setWatchOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("Campaign monitor is synchronized with escalations and alerts.");

  useEffect(() => {
    const next = readSupervisorCampaignMonitor();
    setCampaigns(next);
    setSelectedId(next[0]?.id ?? null);
  }, []);

  useEffect(() => {
    writeSupervisorCampaignMonitor(campaigns);
  }, [campaigns]);

  const filtered = useMemo(() => {
    return campaigns
      .filter((item) => (statusFilter === "all" ? true : item.status === statusFilter))
      .filter((item) => (watchOnly ? item.watchlist : true))
      .sort((a, b) => b.sentimentRisk - a.sentimentRisk);
  }, [campaigns, statusFilter, watchOnly]);

  const selected = filtered.find((item) => item.id === selectedId) || filtered[0] || null;

  function updateCampaign(id: string, updater: (item: CampaignMonitorItem) => CampaignMonitorItem) {
    setCampaigns((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  }

  function cycleStatus() {
    if (!selected) return;
    const next = selected.status === "active" ? "watch" : selected.status === "watch" ? "paused" : "active";
    updateCampaign(selected.id, (item) => ({ ...item, status: next, updatedAt: new Date().toISOString() }));
    setMessage(`${selected.name} moved to ${next} state.`);
  }

  function toggleWatchlist() {
    if (!selected) return;
    updateCampaign(selected.id, (item) => ({ ...item, watchlist: !item.watchlist, updatedAt: new Date().toISOString() }));
    setMessage(`${selected.name} watchlist toggled.`);
  }

  function adjustHealth(delta: number) {
    if (!selected) return;
    updateCampaign(selected.id, (item) => ({
      ...item,
      health: Math.max(0, Math.min(100, item.health + delta)),
      sentimentRisk: Math.max(0, Math.min(100, item.sentimentRisk - delta)),
      updatedAt: new Date().toISOString(),
    }));
    setMessage(`${selected.name} health adjusted by ${delta > 0 ? "+" : ""}${delta}.`);
  }

  function escalateCampaign() {
    if (!selected) return;

    const escalations = readSupervisorEscalations();
    const alerts = readSupervisorAlerts();
    const escalation = createSupervisorEscalation({
      agentId: "agent-campaign",
      agentName: selected.owner,
      campaignId: selected.id,
      campaignName: selected.name,
      severity: "high",
      status: "new",
      reason: "Campaign risk escalation from monitoring panel",
      customer: `${selected.name} campaign portfolio`,
      owner: "Supervisor Queue",
      slaMinutes: 30,
      notes: ["Generated from campaign monitor"],
    });

    writeSupervisorEscalations([escalation, ...escalations]);
    writeSupervisorAlerts([
      createSupervisorAlert({
        type: "campaign",
        title: "Campaign escalated",
        message: `${selected.name} was escalated from campaign monitoring.`,
        relatedId: escalation.id,
        read: false,
        pinned: false,
        snoozedUntil: null,
      }),
      ...alerts,
    ]);

    setMessage(`${selected.name} escalation created and sent to Alerts + Escalations.`);
  }

  return (
    <SupervisorScreenShell
      activeKey="campaigns"
      contextLabel="Campaign Monitoring"
      eyebrow="Supervisor / Campaign Health"
      title="Campaign Monitoring"
      description="Track campaign risk, health, and live load while creating linked escalations from campaign-level signals."
    >
      <p className="mb-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>

      <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={inputClass}>
            <option value="all">All states</option>
            <option value="active">Active</option>
            <option value="watch">Watch</option>
            <option value="paused">Paused</option>
          </select>
          <button type="button" onClick={() => setWatchOnly((current) => !current)} className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[12px] border border-white/12 bg-white/[0.02] text-[12px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:bg-white/[0.05]">
            <Eye size={14} strokeWidth={2.1} />
            {watchOnly ? "Showing Watchlist" : "Show Watchlist"}
          </button>
          <Link href="/supervisor/escalations" className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[12px] border border-white/12 bg-white/[0.02] text-[12px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:bg-white/[0.05]">
            <AlertTriangle size={14} strokeWidth={2.1} />
            Open Escalations
          </Link>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Campaign Queue</h2>
            <Badge color="neutral">{filtered.length} visible</Badge>
          </div>
          <div className="space-y-2.5">
            {filtered.map((campaign) => (
              <button key={campaign.id} type="button" onClick={() => setSelectedId(campaign.id)} className={["w-full rounded-[13px] border p-3 text-left transition-colors", selected?.id === campaign.id ? "border-[#b9b7ff]/28 bg-[#b9b7ff]/10" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"].join(" ")}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-white">{campaign.name}</div>
                    <div className="mt-1 text-[12px] text-white/50">Owner {campaign.owner} • Calls {campaign.activeCalls}</div>
                  </div>
                  <Badge color={campaign.status === "watch" ? "tertiary" : campaign.status === "paused" ? "neutral" : "success"}>{campaign.status.toUpperCase()}</Badge>
                </div>
                <ProgressBar className="mt-3" value={campaign.health} color={campaign.health > 65 ? "primary" : "tertiary"} label="Health" showValue />
              </button>
            ))}
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          {selected ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">{selected.name}</h2>
                <Badge color={selected.watchlist ? "tertiary" : "primary"}>{selected.watchlist ? "WATCHLIST" : "NORMAL"}</Badge>
              </div>

              <div className="space-y-3 text-[12px] text-white/60">
                <div className={mini}>Active agents: {selected.activeAgents}</div>
                <div className={mini}>Active calls: {selected.activeCalls}</div>
                <div className={mini}>Sentiment risk: {selected.sentimentRisk}%</div>
              </div>

              <div className="mt-3 space-y-3">
                <ProgressBar value={selected.health} color="primary" label="Health" showValue />
                <ProgressBar value={selected.sentimentRisk} color="tertiary" label="Risk" showValue />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={cycleStatus} className={ghostBtn}>Cycle Status</button>
                <button type="button" onClick={toggleWatchlist} className={ghostBtn}>Toggle Watchlist</button>
                <button type="button" onClick={() => adjustHealth(5)} className={solidBtn}>Health +5</button>
                <button type="button" onClick={() => adjustHealth(-5)} className={ghostBtn}>Health -5</button>
              </div>

              <button type="button" onClick={escalateCampaign} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#f6c56f] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#2f2206] hover:bg-[#f9d07f]">
                <AlertTriangle size={13} />
                Escalate Campaign
              </button>
            </>
          ) : (
            <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62">No campaign matches current filters.</div>
          )}
        </Card>
      </div>
    </SupervisorScreenShell>
  );
}

const inputClass = "h-[46px] rounded-[12px] border border-white/[0.08] bg-[#191c28] px-3 text-[13px] text-white/84 outline-none focus:border-[#b9b7ff]/40";
const mini = "rounded-[11px] border border-white/[0.06] bg-white/[0.02] px-3 py-2";
const ghostBtn = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const solidBtn = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#b9b7ff] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#20264b] hover:bg-[#c8c6ff]";
