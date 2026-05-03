"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Filter,
  PhoneCall,
  Play,
  ShieldCheck,
  SquareActivity,
  UserRound,
} from "lucide-react";
import { Badge, Card, ProgressBar, SearchInput } from "@/components/ui/ui-components";
import {
  AgentCallHistoryItem,
  AgentLeadItem,
  completeAgentCall,
  launchAgentCampaign,
  readAgentActiveCalls,
  readAgentCampaigns,
  readAgentScripts,
  updateAgentLeadFields,
  updateAgentLeadScore,
  updateAgentLeadStatus,
  useAgentActiveCalls,
  useAgentCallHistory,
  useAgentCampaigns,
  useAgentLeads,
} from "@/lib/agent-state";
import { formatLiveCallDuration, liveCallSentimentLabel, liveCallStatusLabel } from "@/components/supervisor/live-calls";
import { AgentScreenShell } from "@/components/dashboard/AgentScreenShell";

function statusBadgeColor(status: string) {
  if (status === "Running") return "success";
  if (status === "Paused") return "tertiary";
  return "primary";
}

function leadBadgeColor(status: AgentLeadItem["status"]) {
  if (status === "Hot") return "tertiary";
  if (status === "Warm") return "primary";
  return "neutral";
}

function outcomeBadgeColor(outcome: AgentCallHistoryItem["outcome"]) {
  if (outcome === "Converted") return "success";
  if (outcome === "Pending") return "primary";
  return "danger";
}

export function AgentDashboardPage() {
  const [campaigns] = useAgentCampaigns();
  const [activeCalls] = useAgentActiveCalls();
  const [history] = useAgentCallHistory();
  const [leads] = useAgentLeads();
  const router = useRouter();

  const activeCount = activeCalls.length;
  const runningCampaigns = campaigns.filter((campaign) => campaign.status === "Running").length;
  const hotLeads = leads.filter((lead) => lead.status === "Hot").length;
  const recentHistory = history.slice(0, 3);
  const selectedCampaign = campaigns[0] ?? null;

  return (
    <AgentScreenShell
      activeKey="dashboard"
      contextLabel=""
      eyebrow="Agent / Home"
      title="Agent Dashboard"
      description="Launch campaigns, watch live AI calls, review outcomes, and move leads forward from one place."
      showContextLabel={false}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Active Calls" value={String(activeCount)} accent="text-[#b9b7ff]" icon={<PhoneCall size={17} strokeWidth={2.1} aria-hidden="true" />} />
        <SummaryCard label="Running Campaigns" value={String(runningCampaigns)} accent="text-[#8fdde0]" icon={<Play size={17} strokeWidth={2.1} aria-hidden="true" />} />
        <SummaryCard label="Hot Leads" value={String(hotLeads)} accent="text-[#f6c56f]" icon={<ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />} />
        <SummaryCard label="Recent Calls" value={String(history.length)} accent="text-[#f3a8ff]" icon={<BarChart3 size={17} strokeWidth={2.1} aria-hidden="true" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Campaign Overview</div>
              <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Launch ready campaigns</h2>
            </div>
            <Link href="/dashboard/campaigns" className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[11px] font-semibold uppercase tracking-[0.11em] text-white/76 hover:bg-white/[0.06]">
              Open Launcher
              <ArrowRight size={14} strokeWidth={2.1} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {campaigns.map((campaign) => (
              <button key={campaign.id} type="button" onClick={() => router.push("/dashboard/campaigns")} className="w-full rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-3 text-left hover:bg-white/[0.04]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-headline text-[21px] font-semibold tracking-[-0.03em] text-white">{campaign.name}</div>
                      <Badge color={statusBadgeColor(campaign.status)} className="!uppercase !tracking-[0.1em]">{campaign.status}</Badge>
                    </div>
                    <div className="mt-1.5 text-[12px] leading-5 text-white/48">{campaign.product} for {campaign.audience}</div>
                  </div>
                  <div className="text-right text-[12px] text-white/52">
                    <div>{campaign.persona}</div>
                    <div className="mt-1">Lead pool {campaign.leadPool}</div>
                  </div>
                </div>
                <ProgressBar value={Math.min(100, campaign.leadPool * 4)} color={campaign.status === "Running" ? "primary" : "tertiary"} className="mt-3" label="Lead pool readiness" showValue />
              </button>
            ))}
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Quick Actions</div>
          <div className="mt-3 grid gap-3">
            <Link href="/dashboard/campaigns" className={quickLink}>Launch campaign session</Link>
            <Link href="/dashboard/live" className={quickLink}>Monitor live calls</Link>
            <Link href="/dashboard/history" className={quickLink}>Review call history</Link>
            <Link href="/dashboard/leads" className={quickLink}>Update lead statuses</Link>
          </div>

          <div className="mt-5 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">Campaign focus</div>
            <div className="mt-2 text-[18px] font-semibold text-white">{selectedCampaign?.name ?? "No campaign selected"}</div>
            <div className="mt-1 text-[12px] leading-6 text-white/50">{selectedCampaign ? `${selectedCampaign.persona} tone, ${selectedCampaign.defaultBatchSize} call batch, ${selectedCampaign.leadPool} leads ready.` : "Campaign data is stored locally in the browser."}</div>
            <button type="button" onClick={() => router.push("/dashboard/campaigns")} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#b9b7ff] px-4 text-[11px] font-semibold uppercase tracking-[0.11em] text-[#20264b] hover:bg-[#c8c6ff]">
              <Play size={14} strokeWidth={2.1} aria-hidden="true" />
              Open launcher
            </button>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Live Calls Preview</div>
              <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Current monitoring queue</h2>
            </div>
            <Badge color="primary">{activeCount} running</Badge>
          </div>

          <div className="space-y-3">
            {activeCalls.slice(0, 3).map((call) => (
              <button key={call.id} type="button" onClick={() => router.push(`/dashboard/call/${call.id}`)} className="w-full rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3 text-left hover:bg-white/[0.05]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-white">{call.leadName}</div>
                    <div className="mt-1 text-[12px] text-white/50">{call.campaignName}</div>
                  </div>
                  <div className="text-right text-[12px] text-white/58">
                    <div>{formatLiveCallDuration(call.duration)}</div>
                    <div className="mt-1">Risk {call.riskScore}%</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge color={call.status === "escalated" ? "danger" : call.status === "at-risk" ? "tertiary" : "success"}>{liveCallStatusLabel(call.status)}</Badge>
                  <Badge color={call.sentiment === "negative" ? "danger" : call.sentiment === "neutral" ? "neutral" : "success"}>{liveCallSentimentLabel(call.sentiment)}</Badge>
                </div>
              </button>
            ))}
            {activeCalls.length === 0 ? <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62">No active calls are running. Launch a campaign to populate the monitor.</div> : null}
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Call History</div>
              <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Recent completed calls</h2>
            </div>
            <Link href="/dashboard/history" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b9b7ff] hover:text-white">Open history</Link>
          </div>

          <div className="space-y-3">
            {recentHistory.map((entry) => (
              <div key={entry.id} className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-white">{entry.leadName}</div>
                    <div className="mt-1 text-[12px] text-white/48">{entry.campaignName}</div>
                  </div>
                  <Badge color={outcomeBadgeColor(entry.outcome)}>{entry.outcome}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-white/56">
                  <span>{formatLiveCallDuration(entry.duration)}</span>
                  <span>Lead score {entry.leadScore}</span>
                  <span>{entry.completedAt}</span>
                </div>
              </div>
            ))}
            {recentHistory.length === 0 ? <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62">Completed calls will appear here after archiving.</div> : null}
          </div>
        </Card>
      </div>
    </AgentScreenShell>
  );
}

export function AgentCampaignsPage() {
  const [campaigns, setCampaigns] = useAgentCampaigns();
  const [activeCalls] = useAgentActiveCalls();
  const [batchSize, setBatchSize] = useState(3);
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id ?? "");
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [message, setMessage] = useState("Select a campaign and start a local AI calling session.");

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0] ?? null;
  const availableScripts = useMemo(
    () => readAgentScripts().filter((script) => script.campaignId === selectedCampaign?.id),
    [selectedCampaign?.id]
  );
  const selectedScript = availableScripts.find((script) => script.id === selectedScriptId) ?? null;
  const totalLeads = campaigns.reduce((sum, campaign) => sum + campaign.leadPool, 0);

  useEffect(() => {
    setSelectedScriptId("");
  }, [selectedCampaignId]);

  function handleLaunch() {
    if (!selectedCampaign) {
      setMessage("Pick a campaign before launching.");
      return;
    }

    if (!selectedScript) {
      setMessage("Pick a script before starting calls.");
      return;
    }

    const result = launchAgentCampaign(selectedCampaign.id, batchSize, selectedScript.title);
    setCampaigns(readAgentCampaigns());
    setSelectedCampaignId(selectedCampaign.id);
    setMessage(`${result.launched} calls started for ${selectedCampaign.name} using ${selectedScript.title}. ${readAgentActiveCalls().length} calls are now running.`);
  }

  return (
    <AgentScreenShell
      activeKey="campaigns"
      contextLabel="Campaign Launcher"
      eyebrow="Agent / Campaigns"
      title="Campaign Launcher"
      description="Select a campaign, start a small AI calling batch, and watch live calls appear in the shared cockpit."
      showContextLabel={false}
    >
      <p className="rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] leading-5 text-white/60" aria-live="polite">
        {message}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <SummaryCard label="Campaigns" value={String(campaigns.length)} icon={<Database size={17} strokeWidth={2.1} aria-hidden="true" />} accent="text-[#b9b7ff]" />
        <SummaryCard label="Running Calls" value={String(activeCalls.length)} icon={<SquareActivity size={17} strokeWidth={2.1} aria-hidden="true" />} accent="text-[#8fdde0]" />
        <SummaryCard label="Lead Pool" value={String(totalLeads)} icon={<UserRound size={17} strokeWidth={2.1} aria-hidden="true" />} accent="text-[#f6c56f]" />
        <SummaryCard label="Batch Size" value={String(batchSize)} icon={<Filter size={17} strokeWidth={2.1} aria-hidden="true" />} accent="text-[#f3a8ff]" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Campaign List</div>
              <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Select a campaign</h2>
            </div>
            <Link href="/dashboard/live" className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[11px] font-semibold uppercase tracking-[0.11em] text-white/76 hover:bg-white/[0.06]">
              Open live monitor
            </Link>
          </div>

          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <button key={campaign.id} type="button" onClick={() => setSelectedCampaignId(campaign.id)} className={["w-full rounded-[14px] border p-3 text-left transition-colors", selectedCampaignId === campaign.id ? "border-[#b9b7ff]/24 bg-[#b9b7ff]/8" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]"].join(" ") }>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-headline text-[21px] font-semibold tracking-[-0.03em] text-white">{campaign.name}</div>
                      <Badge color={statusBadgeColor(campaign.status)} className="!uppercase !tracking-[0.1em]">{campaign.status}</Badge>
                    </div>
                    <div className="mt-1.5 text-[12px] leading-5 text-white/48">{campaign.product} • {campaign.audience}</div>
                  </div>
                  <div className="text-right text-[12px] text-white/52">
                    <div>{campaign.persona}</div>
                    <div className="mt-1">Last launch {campaign.lastLaunchedAt ?? "not yet launched"}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] text-white/54">Lead pool {campaign.leadPool}</span>
                  <span className="text-[12px] text-white/54">Default batch {campaign.defaultBatchSize}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Launch Session</div>
          <div className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-white">{selectedCampaign?.name ?? "No campaign selected"}</div>
          <div className="mt-1 text-[13px] text-white/50">{selectedCampaign ? `${selectedCampaign.persona} tone with ${selectedCampaign.leadPool} leads ready.` : "Pick a campaign from the list."}</div>

          <div className="mt-5 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">Step 2 / Select Script</div>
            <div className="mt-3 space-y-2">
              {availableScripts.length > 0 ? (
                availableScripts.map((script) => (
                  <button
                    key={script.id}
                    type="button"
                    onClick={() => setSelectedScriptId(script.id)}
                    className={[
                      "w-full rounded-[12px] border px-3 py-3 text-left transition-colors",
                      selectedScript?.id === script.id ? "border-[#b9b7ff]/24 bg-[#b9b7ff]/8" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[14px] font-semibold text-white">{script.title}</div>
                        <div className="mt-1 text-[12px] leading-5 text-white/50">{script.summary}</div>
                      </div>
                      {selectedScript?.id === script.id ? <Badge color="primary">Selected</Badge> : null}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[12px] text-white/56">
                  No scripts are available for this campaign yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">Batch Size</span>
              <input
                type="number"
                min={1}
                max={6}
                value={batchSize}
                onChange={(event) => setBatchSize(Number(event.target.value) || 1)}
                className="w-full rounded-[13px] border border-white/[0.08] bg-[#191c28] px-4 py-3 text-[13px] leading-6 text-white/84 outline-none focus:border-[#b9b7ff]/40"
              />
            </label>
            <div className="rounded-[13px] border border-white/[0.08] bg-[#191c28] px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">Current Running Calls</div>
              <div className="mt-2 text-[28px] font-semibold text-white">{activeCalls.length}</div>
            </div>
          </div>

          <button type="button" onClick={handleLaunch} disabled={!selectedScript} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#b9b7ff] px-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#20264b] hover:bg-[#c8c6ff] disabled:cursor-not-allowed disabled:opacity-50">
            <Play size={14} strokeWidth={2.1} aria-hidden="true" />
            Start AI Calls
          </button>

          <div className="mt-5 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4 text-[12px] text-white/60">
            The launcher writes active calls into the shared live-call store so the cockpit and live monitor stay in sync.
          </div>
        </Card>
      </div>
    </AgentScreenShell>
  );
}

export function AgentLiveCallsPage() {
  const [activeCalls] = useAgentActiveCalls();
  const [message, setMessage] = useState("Click a call to open the shared cockpit or complete it locally to archive the outcome.");
  const router = useRouter();

  const active = useMemo(() => activeCalls.filter((call) => call.status === "active").sort((a, b) => b.duration - a.duration), [activeCalls]);
  const atRisk = useMemo(() => activeCalls.filter((call) => call.status !== "active").sort((a, b) => b.riskScore - a.riskScore), [activeCalls]);

  function handleComplete(callId: string) {
    const archived = completeAgentCall(callId);
    if (archived) {
      setMessage(`Archived ${archived.leadName} from ${archived.campaignName}.`);
    }
  }

  return (
    <AgentScreenShell
      activeKey="live"
      contextLabel=""
      eyebrow="Agent / Live"
      title="Live Call Monitor"
      description="Monitor running AI calls, jump into the shared cockpit, or complete calls to move them into history."
      showContextLabel={false}
    >
      <p className="rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] leading-5 text-white/60" aria-live="polite">
        {message}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Active" value={String(active.length)} icon={<SquareActivity size={17} strokeWidth={2.1} aria-hidden="true" />} accent="text-[#b9b7ff]" />
        <SummaryCard label="At Risk" value={String(atRisk.length)} icon={<ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />} accent="text-[#f6c56f]" />
        <SummaryCard label="Total Calls" value={String(activeCalls.length)} icon={<PhoneCall size={17} strokeWidth={2.1} aria-hidden="true" />} accent="text-[#8fdde0]" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CallListCard
          title="Active Calls"
          subtitle="Shared cockpit compatible"
          calls={active}
          onOpen={(callId) => router.push(`/dashboard/call/${callId}`)}
          onComplete={handleComplete}
          emptyText="No active calls yet."
        />
        <CallListCard
          title="At-Risk Calls"
          subtitle="Needs attention"
          calls={atRisk}
          onOpen={(callId) => router.push(`/dashboard/call/${callId}`)}
          onComplete={handleComplete}
          emptyText="No at-risk calls right now."
        />
      </div>
    </AgentScreenShell>
  );
}

export function AgentHistoryPage() {
  const [history] = useAgentCallHistory();
  const [leads] = useAgentLeads();
  const [query, setQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | AgentCallHistoryItem["outcome"]>("all");
  const [selectedId, setSelectedId] = useState(history[0]?.id ?? "");
  const [message, setMessage] = useState("Select a call to inspect the outcome and update the linked lead.");

  const filteredHistory = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    return history.filter((entry) => {
      const matchesQuery = !searchText || [entry.leadName, entry.campaignName, entry.outcome, String(entry.leadScore)].some((value) => value.toLowerCase().includes(searchText));
      const matchesOutcome = outcomeFilter === "all" || entry.outcome === outcomeFilter;
      return matchesQuery && matchesOutcome;
    });
  }, [history, outcomeFilter, query]);

  const selected = filteredHistory.find((entry) => entry.id === selectedId) ?? filteredHistory[0] ?? null;
  const linkedLead = leads.find((lead) => lead.id === selected?.leadId) ?? null;

  function promoteLead(status: AgentLeadItem["status"]) {
    if (!selected) {
      return;
    }

    updateAgentLeadStatus(selected.leadId, status);
    setMessage(`${selected.leadName} marked as ${status}.`);
  }

  return (
    <AgentScreenShell
      activeKey="history"
      contextLabel="Call History"
      eyebrow="Agent / History"
      title="Call History"
      description="Review completed calls, inspect outcomes, and update the linked lead from the archived record."
      showContextLabel={false}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Search & Filter</div>
              <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Completed calls</h2>
            </div>
            <div className="flex gap-2">
              {(["all", "Converted", "Pending", "Lost"] as const).map((option) => (
                <button key={option} type="button" onClick={() => setOutcomeFilter(option)} className={outcomeFilter === option ? activeChip : chip}>
                  {option === "all" ? "All" : option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 max-w-[360px]">
            <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search history..." />
          </div>

          <div className="mt-4 space-y-3">
            {filteredHistory.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setSelectedId(entry.id);
                  setMessage(`${entry.leadName} selected.`);
                }}
                className={["w-full rounded-[14px] border p-3 text-left", selected?.id === entry.id ? "border-[#b9b7ff]/24 bg-[#b9b7ff]/8" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]"].join(" ")}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[16px] font-semibold text-white">{entry.leadName}</div>
                    <div className="mt-1 text-[12px] text-white/48">{entry.campaignName}</div>
                  </div>
                  <Badge color={outcomeColor(entry.outcome)}>{entry.outcome}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-white/56">
                  <span>{formatLiveCallDuration(entry.duration)}</span>
                  <span>Lead score {entry.leadScore}</span>
                  <span>{entry.completedAt}</span>
                </div>
              </button>
            ))}
            {filteredHistory.length === 0 ? <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62">No calls match the current filters.</div> : null}
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Details</div>
          <div className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-white">{selected?.leadName ?? "No selection"}</div>
          <div className="mt-1 text-[13px] text-white/50">{selected?.campaignName ?? "Pick a completed call to inspect it."}</div>

          {selected ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4 text-[12px] leading-6 text-white/62">
                <div className="flex items-center justify-between gap-3 text-white/78">
                  <span>Outcome</span>
                  <Badge color={outcomeColor(selected.outcome)}>{selected.outcome}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>Sentiment</span>
                  <span>{liveCallSentimentLabel(selected.sentiment)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>Lead score</span>
                  <span>{selected.leadScore}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>Duration</span>
                  <span>{formatLiveCallDuration(selected.duration)}</span>
                </div>
              </div>

              <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4 text-[12px] leading-6 text-white/62">
                <div className="text-white/78">Linked lead</div>
                <div className="mt-2 text-[16px] font-semibold text-white">{linkedLead?.name ?? selected.leadName}</div>
                <div className="mt-1 text-white/50">{linkedLead?.contact ?? "No contact found"}</div>
                <div className="mt-2 text-white/54">Status: {linkedLead?.status ?? "Unknown"}</div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button type="button" onClick={() => promoteLead("Hot")} className={solidButton}>
                  <CheckCircle2 size={14} strokeWidth={2.1} aria-hidden="true" />
                  Mark Hot
                </button>
                <button type="button" onClick={() => promoteLead("Warm")} className={ghostButton}>
                  <Clock3 size={14} strokeWidth={2.1} aria-hidden="true" />
                  Mark Warm
                </button>
                <Link href="/dashboard/leads" className={ghostButton}>
                  <ArrowRight size={14} strokeWidth={2.1} aria-hidden="true" />
                  Open Leads
                </Link>
              </div>
            </div>
          ) : null}

          <p className="mt-5 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60" aria-live="polite">
            {message}
          </p>
        </Card>
      </div>
    </AgentScreenShell>
  );
}

export function AgentLeadsPage() {
  const [leads] = useAgentLeads();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AgentLeadItem["status"]>("all");
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0]?.id ?? "");
  const [message, setMessage] = useState("Search or filter leads, then update their status after calls complete.");

  const filteredLeads = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesQuery = !searchText || [lead.name, lead.contact, lead.campaign, lead.notes, String(lead.score)].some((value) => value.toLowerCase().includes(searchText));
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [leads, query, statusFilter]);

  const selectedLead = filteredLeads.find((lead) => lead.id === selectedLeadId) ?? filteredLeads[0] ?? null;
  const campaignFieldEntries = selectedLead ? Object.entries(selectedLead.campaignFields) : [];

  function setStatus(status: AgentLeadItem["status"]) {
    if (!selectedLead) {
      return;
    }

    updateAgentLeadStatus(selectedLead.id, status);
    setMessage(`${selectedLead.name} updated to ${status}.`);
  }

  function boostScore(delta: number) {
    if (!selectedLead) {
      return;
    }

    const nextScore = Math.max(0, Math.min(100, selectedLead.score + delta));
    updateAgentLeadScore(selectedLead.id, nextScore);
    setMessage(`${selectedLead.name} score updated to ${nextScore}.`);
  }

  return (
    <AgentScreenShell
      activeKey="leads"
      contextLabel="Leads & CRM"
      eyebrow="Agent / Leads"
      title="Leads & CRM"
      description="Manage lead status, review the latest interaction, and keep the CRM clean after each call ends."
      showContextLabel={false}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Search & Filter</div>
              <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Lead directory</h2>
            </div>
            <div className="flex gap-2">
              {(["all", "Hot", "Warm", "Cold"] as const).map((option) => (
                <button key={option} type="button" onClick={() => setStatusFilter(option)} className={statusFilter === option ? activeChip : chip}>
                  {option === "all" ? "All" : option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 max-w-[360px]">
            <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leads..." />
          </div>

          <div className="mt-4 space-y-3">
            {filteredLeads.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => {
                  setSelectedLeadId(lead.id);
                  setMessage(`${lead.name} selected.`);
                }}
                className={["w-full rounded-[14px] border p-3 text-left", selectedLead?.id === lead.id ? "border-[#b9b7ff]/24 bg-[#b9b7ff]/8" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]"].join(" ")}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[16px] font-semibold text-white">{lead.name}</div>
                    <div className="mt-1 text-[12px] text-white/48">{lead.contact} • {lead.campaign}</div>
                  </div>
                  <Badge color={leadBadgeColor(lead.status)}>{lead.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-white/56">
                  <span>Score {lead.score}</span>
                  <span>{lead.lastInteraction}</span>
                </div>
              </button>
            ))}
            {filteredLeads.length === 0 ? <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62">No leads match the current filters.</div> : null}
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Lead Detail</div>
          <div className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-white">{selectedLead?.name ?? "No selection"}</div>
          <div className="mt-1 text-[13px] text-white/50">{selectedLead?.campaign ?? "Pick a lead to view details."}</div>

          {selectedLead ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4 text-[12px] leading-6 text-white/62">
                <div className="text-white/78">General Info</div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <InfoRow label="First Name" value={selectedLead.firstName} />
                  <InfoRow label="Last Name" value={selectedLead.lastName} />
                  <InfoRow label="City" value={selectedLead.city} />
                  <InfoRow label="Zip Code" value={selectedLead.zipCode} />
                  <InfoRow label="Contact" value={selectedLead.contact} />
                  <InfoRow label="Campaign Type" value={selectedLead.campaignType} />
                  <InfoRow label="Status" value={<Badge color={leadBadgeColor(selectedLead.status)}>{selectedLead.status}</Badge>} />
                  <InfoRow label="Lead Score" value={selectedLead.score} />
                </div>
              </div>

              <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4 text-[12px] leading-6 text-white/62">
                <div className="text-white/78">Campaign-Specific Fields</div>
                <div className="mt-3 space-y-2">
                  {campaignFieldEntries.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-[10px] border border-white/[0.05] bg-white/[0.015] px-3 py-2">
                      <span className="text-white/48">{label}</span>
                      <span className="text-white/78">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4 text-[12px] leading-6 text-white/62">
                <div className="text-white/78">Call Summary</div>
                <div className="mt-2 text-white/56">{selectedLead.callSummary}</div>
                <div className="mt-3 text-white/42">Notes: {selectedLead.notes}</div>
                <div className="mt-2 text-white/42">Last touch: {selectedLead.lastInteraction}</div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button type="button" onClick={() => setStatus("Hot")} className={solidButton}>
                  <CheckCircle2 size={14} strokeWidth={2.1} aria-hidden="true" />
                  Mark Hot
                </button>
                <button type="button" onClick={() => setStatus("Warm")} className={ghostButton}>
                  <Clock3 size={14} strokeWidth={2.1} aria-hidden="true" />
                  Mark Warm
                </button>
                <button type="button" onClick={() => setStatus("Cold")} className={ghostButton}>
                  <Filter size={14} strokeWidth={2.1} aria-hidden="true" />
                  Mark Cold
                </button>
                <button type="button" onClick={() => boostScore(5)} className={ghostButton}>
                  <ArrowRight size={14} strokeWidth={2.1} aria-hidden="true" />
                  Boost Score +5
                </button>
                <Link href={`/dashboard/leads/${selectedLead.id}`} className={ghostButton}>
                  <Database size={14} strokeWidth={2.1} aria-hidden="true" />
                  View Full Details
                </Link>
              </div>
            </div>
          ) : null}

          <p className="mt-5 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60" aria-live="polite">
            {message}
          </p>
        </Card>
      </div>
    </AgentScreenShell>
  );
}

export function AgentLeadDetailPage({ leadId }: { leadId: string }) {
  const [leads] = useAgentLeads();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<AgentLeadItem> | null>(null);
  const [message, setMessage] = useState("Load a lead and edit its details.");
  const router = useRouter();

  const lead = useMemo(() => leads.find((l) => l.id === leadId), [leads, leadId]);

  useEffect(() => {
    if (lead && !formData) {
      setFormData(lead);
    }
  }, [lead, formData]);

  function handleFieldChange(field: keyof AgentLeadItem, value: string | number) {
    if (!formData) return;
    setFormData((prev) => prev ? { ...prev, [field]: value } : null);
  }

  function handleCampaignFieldChange(field: string, value: string) {
    if (!formData) return;
    setFormData((prev) =>
      prev
        ? { ...prev, campaignFields: { ...prev.campaignFields, [field]: value } }
        : null
    );
  }

  function handleSave() {
    if (!lead || !formData) return;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...updates } = { ...formData };
    updateAgentLeadFields(lead.id, updates as Partial<Omit<AgentLeadItem, "id">>);
    setEditMode(false);
    setMessage(`${formData.name} saved successfully.`);
  }

  if (!lead) {
    return (
      <AgentScreenShell activeKey="leads" contextLabel="" eyebrow="Agent / Leads" title="Lead Not Found" description="">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="text-center py-8">
            <div className="text-[16px] font-semibold text-white/60">Lead not found.</div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/leads")}
              className={ghostButton + " mt-4"}
            >
              <ArrowRight size={14} strokeWidth={2.1} aria-hidden="true" />
              Back to Leads
            </button>
          </div>
        </Card>
      </AgentScreenShell>
    );
  }

  return (
    <AgentScreenShell
      activeKey="leads"
      contextLabel=""
      eyebrow="Agent / Leads / Detail"
      title={formData?.name ?? "Lead Detail"}
      description="View and edit lead information. All changes are saved immediately."
      showContextLabel={false}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Lead Information</h2>
            <button
              type="button"
              onClick={() => (editMode ? handleSave() : setEditMode(true))}
              className={solidButton}
            >
              {editMode ? "Save Changes" : "Edit Lead"}
            </button>
          </div>

          {editMode && (
            <button
              type="button"
              onClick={() => {
                setFormData(lead);
                setEditMode(false);
              }}
              className={ghostButton + " mb-4"}
            >
              Cancel
            </button>
          )}

          {formData ? (
            <div className="space-y-5">
              <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-white/78 font-semibold mb-3">General Information</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <EditableField
                    label="First Name"
                    value={String(formData.firstName ?? "")}
                    onChange={(v) => handleFieldChange("firstName", v)}
                    readOnly={!editMode}
                  />
                  <EditableField
                    label="Last Name"
                    value={String(formData.lastName ?? "")}
                    onChange={(v) => handleFieldChange("lastName", v)}
                    readOnly={!editMode}
                  />
                  <EditableField
                    label="Contact"
                    value={String(formData.contact ?? "")}
                    onChange={(v) => handleFieldChange("contact", v)}
                    readOnly={!editMode}
                  />
                  <EditableField
                    label="City"
                    value={String(formData.city ?? "")}
                    onChange={(v) => handleFieldChange("city", v)}
                    readOnly={!editMode}
                  />
                  <EditableField
                    label="Zip Code"
                    value={String(formData.zipCode ?? "")}
                    onChange={(v) => handleFieldChange("zipCode", v)}
                    readOnly={!editMode}
                  />
                  <EditableField
                    label="Campaign Type"
                    value={String(formData.campaignType ?? "")}
                    onChange={(v) => handleFieldChange("campaignType", v)}
                    readOnly={!editMode}
                  />
                </div>
              </div>

              <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-white/78 font-semibold mb-3">Status & Score</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-[10px] border border-white/[0.05] bg-white/[0.015] px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Status</div>
                    {editMode ? (
                      <select
                        value={formData.status}
                        onChange={(e) => handleFieldChange("status", e.target.value as LeadStatus)}
                        className="mt-2 w-full bg-white/[0.05] border border-white/10 rounded-[8px] px-2 py-1.5 text-[12px] text-white"
                      >
                        <option value="Hot">Hot</option>
                        <option value="Warm">Warm</option>
                        <option value="Cold">Cold</option>
                      </select>
                    ) : (
                      <div className="mt-1 text-[12px] text-white/80">
                        <Badge color={leadBadgeColor(formData.status ?? "Cold")}>{formData.status ?? "Unknown"}</Badge>
                      </div>
                    )}
                  </div>
                  <EditableField
                    label="Lead Score"
                    value={String(formData.score ?? 0)}
                    onChange={(v) => handleFieldChange("score", Number(v))}
                    readOnly={!editMode}
                    type="number"
                  />
                </div>
              </div>

              <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-white/78 font-semibold mb-3">Campaign-Specific Fields</div>
                <div className="space-y-3">
                  {Object.entries(formData.campaignFields ?? {}).map(([fieldLabel, fieldValue]) => (
                    <EditableField
                      key={fieldLabel}
                      label={fieldLabel}
                      value={String(fieldValue ?? "")}
                      onChange={(v) => handleCampaignFieldChange(fieldLabel, v)}
                      readOnly={!editMode}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-white/78 font-semibold mb-3">Call Summary & Notes</div>
                <div className="space-y-3">
                  {editMode ? (
                    <>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Call Summary</label>
                        <textarea
                          value={formData.callSummary ?? ""}
                          onChange={(e) => handleFieldChange("callSummary", e.target.value)}
                          className="mt-2 w-full bg-white/[0.05] border border-white/10 rounded-[8px] px-3 py-2 text-[12px] text-white"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Notes</label>
                        <textarea
                          value={formData.notes ?? ""}
                          onChange={(e) => handleFieldChange("notes", e.target.value)}
                          className="mt-2 w-full bg-white/[0.05] border border-white/10 rounded-[8px] px-3 py-2 text-[12px] text-white"
                          rows={3}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-[10px] border border-white/[0.05] bg-white/[0.015] px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Call Summary</div>
                        <div className="mt-1 text-[12px] text-white/80">{formData.callSummary ?? "No summary"}</div>
                      </div>
                      <div className="rounded-[10px] border border-white/[0.05] bg-white/[0.015] px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Notes</div>
                        <div className="mt-1 text-[12px] text-white/80">{formData.notes ?? "No notes"}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Actions</div>
          <div className="mt-4 space-y-2">
            <button type="button" onClick={() => router.push("/dashboard/leads")} className={ghostButton}>
              <ArrowRight size={14} strokeWidth={2.1} aria-hidden="true" />
              Back to Leads
            </button>
          </div>

          <p className="mt-5 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60" aria-live="polite">
            {message}
          </p>
        </Card>
      </div>
    </AgentScreenShell>
  );
}

function EditableField({
  label,
  value,
  onChange,
  readOnly = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <div className="rounded-[10px] border border-white/[0.05] bg-white/[0.015] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</div>
      {readOnly ? (
        <div className="mt-1 text-[12px] text-white/80">{value || "—"}</div>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full bg-white/[0.05] border border-white/10 rounded-[8px] px-2 py-1.5 text-[12px] text-white placeholder-white/30"
        />
      )}
    </div>
  );
}

type LeadStatus = "Hot" | "Warm" | "Cold";

function SummaryCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">{label}</div>
          <div className={`mt-3 font-headline text-[42px] font-semibold leading-none tracking-[-0.04em] ${accent}`}>{value}</div>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-[11px] border border-white/[0.08] bg-white/[0.03] text-white/58">
          {icon}
        </span>
      </div>
    </Card>
  );
}

function CallListCard({
  title,
  subtitle,
  calls,
  onOpen,
  onComplete,
  emptyText,
}: {
  title: string;
  subtitle: string;
  calls: ReturnType<typeof readAgentActiveCalls>;
  onOpen: (callId: string) => void;
  onComplete: (callId: string) => void;
  emptyText: string;
}) {
  return (
    <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">{subtitle}</div>
          <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">{title}</h2>
        </div>
      </div>

      <div className="space-y-3">
        {calls.map((call) => (
          <button key={call.id} type="button" onClick={() => onOpen(call.id)} className="w-full rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3 text-left hover:bg-white/[0.05]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-semibold text-white">{call.leadName}</div>
                <div className="mt-1 text-[12px] text-white/50">{call.campaignName}</div>
              </div>
              <div className="text-right text-[12px] text-white/58">
                <div>{formatLiveCallDuration(call.duration)}</div>
                <div className="mt-1">Risk {call.riskScore}%</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge color={call.status === "escalated" ? "danger" : call.status === "at-risk" ? "tertiary" : "success"}>{liveCallStatusLabel(call.status)}</Badge>
              <Badge color={call.sentiment === "negative" ? "danger" : call.sentiment === "neutral" ? "neutral" : "success"}>{liveCallSentimentLabel(call.sentiment)}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={(event) => { event.stopPropagation(); onOpen(call.id); }} className="inline-flex h-8 items-center gap-2 rounded-[9px] border border-white/12 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/82 hover:bg-white/[0.06]">
                <PhoneCall size={13} strokeWidth={2.1} aria-hidden="true" />
                Open Cockpit
              </button>
              <button type="button" onClick={(event) => { event.stopPropagation(); onComplete(call.id); }} className="inline-flex h-8 items-center gap-2 rounded-[9px] bg-[#b9b7ff] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#20264b] hover:bg-[#c8c6ff]">
                <CheckCircle2 size={13} strokeWidth={2.1} aria-hidden="true" />
                Complete
              </button>
            </div>
          </button>
        ))}
        {calls.length === 0 ? <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62">{emptyText}</div> : null}
      </div>
    </Card>
  );
}

function outcomeColor(outcome: AgentCallHistoryItem["outcome"]) {
  if (outcome === "Converted") return "success";
  if (outcome === "Pending") return "primary";
  return "danger";
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-white/[0.05] bg-white/[0.015] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</div>
      <div className="mt-1 text-[12px] text-white/80">{value}</div>
    </div>
  );
}

const chip = "rounded-[9px] border border-white/12 bg-white/[0.02] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/62 hover:bg-white/[0.05]";
const activeChip = "rounded-[9px] border border-[#b9b7ff]/34 bg-[#b9b7ff]/14 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#d9dcff]";
const solidButton = "inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#b9b7ff] px-4 text-[11px] font-semibold uppercase tracking-[0.11em] text-[#20264b] hover:bg-[#c8c6ff]";
const ghostButton = "inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-4 text-[11px] font-semibold uppercase tracking-[0.11em] text-white/76 hover:bg-white/[0.06]";
const quickLink = "flex items-center justify-between rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[13px] font-medium text-white/78 hover:bg-white/[0.05]";
