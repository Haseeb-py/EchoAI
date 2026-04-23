"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Clock3, Siren, Users } from "lucide-react";
import { SupervisorScreenShell } from "@/components/supervisor/SupervisorScreenShell";
import { Badge, Card, ProgressBar } from "@/components/ui/ui-components";
import { formatLiveCallDuration, useSupervisorLiveCalls } from "@/components/supervisor/live-calls";
import {
  readSupervisorAlerts,
  readSupervisorCampaignMonitor,
  readSupervisorEscalations,
  writeSupervisorAlerts,
  writeSupervisorEscalations,
  type EscalationItem,
} from "@/lib/supervisor-state";

export default function SupervisorDashboardPage() {
  const router = useRouter();
  const [escalations, setEscalations] = useState(readSupervisorEscalations);
  const [campaigns, setCampaigns] = useState(readSupervisorCampaignMonitor);
  const [alerts, setAlerts] = useState(readSupervisorAlerts);
  const [liveCalls] = useSupervisorLiveCalls();
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "high">("all");
  const [message, setMessage] = useState("Supervisor command center is live.");

  useEffect(() => {
    setEscalations(readSupervisorEscalations());
    setCampaigns(readSupervisorCampaignMonitor());
    setAlerts(readSupervisorAlerts());
  }, []);

  const totalLiveCalls = liveCalls.length;
  const activeLiveCalls = liveCalls
    .filter((call) => call.status === "active")
    .sort((a, b) => b.riskScore - a.riskScore);
  const atRiskLiveCalls = liveCalls
    .filter((call) => call.status !== "active")
    .sort((a, b) => b.riskScore - a.riskScore);
  const unreadAlerts = alerts.filter((item) => !item.read).length;

  const filteredEscalations = useMemo(() => {
    return escalations
      .filter((item) => item.status !== "resolved")
      .filter((item) => {
        if (severityFilter === "all") {
          return true;
        }
        if (severityFilter === "critical") {
          return item.severity === "critical";
        }
        return item.severity === "critical" || item.severity === "high";
      })
      .sort((a, b) => {
        const rank = { critical: 4, high: 3, medium: 2, low: 1 } as const;
        return rank[b.severity] - rank[a.severity];
      });
  }, [escalations, severityFilter]);

  const topEscalation = filteredEscalations[0] || null;

  function updateEscalation(next: EscalationItem[]) {
    setEscalations(next);
    writeSupervisorEscalations(next);
  }

  function updateAlertsRead() {
    const nextAlerts = alerts.map((item) => ({ ...item, read: true }));
    setAlerts(nextAlerts);
    writeSupervisorAlerts(nextAlerts);
    setMessage("All alerts marked as read.");
  }

  function acknowledgeTopEscalation() {
    if (!topEscalation) {
      setMessage("No open escalations available for acknowledgement.");
      return;
    }

    const nextEscalations: EscalationItem[] = escalations.map((item) =>
      item.id === topEscalation.id
        ? { ...item, status: "acknowledged", owner: "Supervisor Queue", updatedAt: new Date().toISOString() }
        : item
    );

    updateEscalation(nextEscalations);
    setMessage(`${topEscalation.customer} escalation acknowledged.`);
  }

  return (
    <SupervisorScreenShell
      activeKey="overview"
      contextLabel="Supervisor Overview"
      eyebrow="Supervisor / Command Center"
      title="Supervisor Dashboard"
      description="Monitor live operations, triage escalations, and route actions across supervisor workflows."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">Total Live Calls</div>
          <div className="mt-3 font-headline text-[42px] font-semibold leading-none tracking-[-0.04em] text-[#b9b7ff]">{totalLiveCalls}</div>
        </Card>
        <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">Active Calls</div>
          <div className="mt-3 font-headline text-[42px] font-semibold leading-none tracking-[-0.04em] text-[#8fdde0]">{activeLiveCalls.length}</div>
        </Card>
        <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">At-Risk Calls</div>
          <div className="mt-3 font-headline text-[42px] font-semibold leading-none tracking-[-0.04em] text-[#f6c56f]">{atRiskLiveCalls.length}</div>
        </Card>
        <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">Unread Alerts</div>
          <div className="mt-3 font-headline text-[42px] font-semibold leading-none tracking-[-0.04em] text-[#f3a8ff]">{unreadAlerts}</div>
        </Card>
      </div>

      <p className="mt-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Live Call Widget</div>
              <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Active Calls</h2>
            </div>
            <Badge color="primary">{activeLiveCalls.length} running</Badge>
          </div>

          <div className="space-y-3">
            {activeLiveCalls.map((call) => (
              <button key={call.id} type="button" onClick={() => router.push(`/supervisor/call/${call.id}`)} className="w-full rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3 text-left transition-colors hover:bg-white/[0.05]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-white">{call.agentName}</div>
                    <div className="mt-1 text-[12px] text-white/50">{call.campaignName}</div>
                  </div>
                  <div className="text-right text-[12px] text-white/58">
                    <div>{formatLiveCallDuration(call.duration)}</div>
                    <div className="mt-1">Risk {call.riskScore}%</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge color={call.status === "escalated" ? "danger" : call.status === "at-risk" ? "tertiary" : "success"}>{call.status.toUpperCase()}</Badge>
                  <Badge color={call.sentiment === "negative" ? "danger" : call.sentiment === "neutral" ? "neutral" : "success"}>{call.sentiment.toUpperCase()}</Badge>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-white/40">Current node: {call.currentScriptNode}</span>
                </div>
              </button>
            ))}
            {activeLiveCalls.length === 0 ? <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62">No active calls are running right now.</div> : null}
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">At-Risk Calls</div>
              <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Immediate Attention</h2>
            </div>
            <Badge color="danger">{atRiskLiveCalls.length} flagged</Badge>
          </div>

          <div className="space-y-3">
            {atRiskLiveCalls.map((call) => (
              <button key={call.id} type="button" onClick={() => router.push(`/supervisor/call/${call.id}`)} className="w-full rounded-[14px] border border-[#f6c56f]/20 bg-[#241f17] p-3 text-left transition-colors hover:bg-[#2d261a]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-white">{call.agentName}</div>
                    <div className="mt-1 text-[12px] text-white/50">{call.campaignName}</div>
                  </div>
                  <Badge color={call.status === "escalated" ? "danger" : "tertiary"}>{call.status.toUpperCase()}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-white/58">
                  <span>{formatLiveCallDuration(call.duration)}</span>
                  <span>Risk {call.riskScore}%</span>
                  <span>Sentiment {call.sentiment}</span>
                </div>
              </button>
            ))}
            {atRiskLiveCalls.length === 0 ? <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62">No calls are currently at risk.</div> : null}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Escalation Queue</div>
              <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Priority Escalations</h2>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSeverityFilter("all")} className={severityFilter === "all" ? activeChip : chip}>All</button>
              <button type="button" onClick={() => setSeverityFilter("high")} className={severityFilter === "high" ? activeChip : chip}>High+</button>
              <button type="button" onClick={() => setSeverityFilter("critical")} className={severityFilter === "critical" ? activeChip : chip}>Critical</button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredEscalations.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[16px] font-semibold text-white">{item.customer}</div>
                    <div className="mt-1 text-[12px] text-white/48">{item.reason}</div>
                  </div>
                  <Badge color={item.severity === "critical" ? "danger" : "tertiary"}>{item.severity.toUpperCase()}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-white/56">
                  <span>{item.agentName}</span>
                  <span>{item.campaignName}</span>
                  <span>SLA {item.slaMinutes}m</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={acknowledgeTopEscalation} className={solidButton}>
              <CheckCircle2 size={14} strokeWidth={2.1} aria-hidden="true" />
              Acknowledge Top
            </button>
            <Link href="/supervisor/escalations" className={ghostButton}>
              <Siren size={14} strokeWidth={2.1} aria-hidden="true" />
              Open Escalations
            </Link>
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Supervisor Shortcuts</div>
          <div className="mt-4 space-y-3">
            <Link href="/supervisor/activity" className={navCard}>Team Activity Monitor</Link>
            <Link href="/supervisor/performance" className={navCard}>Performance Analytics</Link>
            <Link href="/supervisor/campaigns" className={navCard}>Campaign Monitoring</Link>
            <Link href="/supervisor/alerts" className={navCard}>Alerts and Notifications</Link>
          </div>
          <button type="button" onClick={updateAlertsRead} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] text-[12px] font-semibold uppercase tracking-[0.12em] text-white/82 hover:bg-white/[0.06]">
            <Bell size={14} strokeWidth={2.1} aria-hidden="true" />
            Mark Alerts Read
          </button>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <button key={campaign.id} type="button" onClick={() => setMessage(`${campaign.name} health reviewed from dashboard.`)} className="text-left">
            <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-5 hover:!bg-white/[0.04]">
              <div className="flex items-center justify-between">
                <div className="text-[15px] font-semibold text-white">{campaign.name}</div>
                <Badge color={campaign.status === "watch" ? "tertiary" : "success"}>{campaign.status.toUpperCase()}</Badge>
              </div>
              <div className="mt-3 text-[12px] text-white/50">{campaign.activeCalls} active calls • {campaign.activeAgents} agents</div>
              <ProgressBar className="mt-3" value={campaign.health} color={campaign.health > 65 ? "primary" : "tertiary"} label="Campaign health" showValue />
            </Card>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px] text-white/54">
        <span className="inline-flex items-center gap-1.5"><Users size={14} /> Team data synced</span>
        <span className="inline-flex items-center gap-1.5"><Clock3 size={14} /> Last refresh: live local simulation</span>
      </div>
    </SupervisorScreenShell>
  );
}

const chip = "rounded-[9px] border border-white/12 bg-white/[0.02] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/62 hover:bg-white/[0.05]";
const activeChip = "rounded-[9px] border border-[#b9b7ff]/34 bg-[#b9b7ff]/14 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#d9dcff]";
const solidButton = "inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#b9b7ff] px-4 text-[11px] font-semibold uppercase tracking-[0.11em] text-[#20264b] hover:bg-[#c8c6ff]";
const ghostButton = "inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-4 text-[11px] font-semibold uppercase tracking-[0.11em] text-white/76 hover:bg-white/[0.06]";
const navCard = "flex items-center justify-between rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[13px] font-medium text-white/78 hover:bg-white/[0.05]";
