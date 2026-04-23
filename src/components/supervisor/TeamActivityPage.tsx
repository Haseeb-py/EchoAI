"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Plus, Siren, UserRound } from "lucide-react";
import { SupervisorScreenShell } from "@/components/supervisor/SupervisorScreenShell";
import { Badge, Card, StatusDot } from "@/components/ui/ui-components";
import { formatLiveCallDuration, useSupervisorLiveCalls } from "@/components/supervisor/live-calls";
import {
  createSupervisorAlert,
  createSupervisorEscalation,
  readSupervisorAlerts,
  readSupervisorEscalations,
  readSupervisorTeamActivity,
  writeSupervisorAlerts,
  writeSupervisorEscalations,
  writeSupervisorTeamActivity,
  type AgentLiveStatus,
  type TeamActivityItem,
} from "@/lib/supervisor-state";

const statusOptions: AgentLiveStatus[] = ["online", "onCall", "busy", "wrapping", "away", "offline"];

export default function TeamActivityPage() {
  const router = useRouter();
  const [team, setTeam] = useState(readSupervisorTeamActivity);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AgentLiveStatus>("all");
  const [campaignFilter, setCampaignFilter] = useState<"all" | string>("all");
  const [sortBy, setSortBy] = useState<"utilization" | "calls" | "escalations">("utilization");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("Team activity is interactive and persisted locally.");
  const [liveCalls] = useSupervisorLiveCalls();

  useEffect(() => {
    const nextTeam = readSupervisorTeamActivity();
    setTeam(nextTeam);
    setSelectedId(nextTeam[0]?.id ?? null);
  }, []);

  useEffect(() => {
    writeSupervisorTeamActivity(team);
  }, [team]);

  const campaignOptions = useMemo(() => {
    return Array.from(new Set(team.map((item) => item.campaignName)));
  }, [team]);

  const liveCallByAgentId = useMemo(() => {
    return new Map(liveCalls.map((call) => [call.agentId, call]));
  }, [liveCalls]);

  const activeLiveCalls = useMemo(() => liveCalls.filter((call) => call.status !== "escalated" || call.isSupervisorJoined), [liveCalls]);

  const filteredTeam = useMemo(() => {
    const text = query.trim().toLowerCase();
    return team
      .filter((item) => (statusFilter === "all" ? true : item.status === statusFilter))
      .filter((item) => (campaignFilter === "all" ? true : item.campaignName === campaignFilter))
      .filter((item) => (!text ? true : [item.name, item.region, item.campaignName].some((part) => part.toLowerCase().includes(text))))
      .sort((a, b) => {
        if (sortBy === "calls") return b.activeCalls - a.activeCalls;
        if (sortBy === "escalations") return b.escalationsToday - a.escalationsToday;
        return b.utilization - a.utilization;
      });
  }, [team, statusFilter, campaignFilter, query, sortBy]);

  const selected = filteredTeam.find((item) => item.id === selectedId) || filteredTeam[0] || null;

  function updateTeamItem(id: string, updater: (item: TeamActivityItem) => TeamActivityItem) {
    setTeam((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  }

  function cycleStatus() {
    if (!selected) return;
    const index = statusOptions.indexOf(selected.status);
    const nextStatus = statusOptions[(index + 1) % statusOptions.length];
    updateTeamItem(selected.id, (item) => ({ ...item, status: nextStatus, updatedAt: new Date().toISOString() }));
    setMessage(`${selected.name} status updated to ${nextStatus}.`);
  }

  function adjustCalls(delta: number) {
    if (!selected) return;
    updateTeamItem(selected.id, (item) => ({
      ...item,
      activeCalls: Math.max(0, item.activeCalls + delta),
      utilization: Math.max(0, Math.min(100, item.utilization + delta * 4)),
      updatedAt: new Date().toISOString(),
    }));
    setMessage(`${selected.name} active calls adjusted by ${delta > 0 ? "+" : ""}${delta}.`);
  }

  function updateNote(nextNote: string) {
    if (!selected) return;
    updateTeamItem(selected.id, (item) => ({ ...item, note: nextNote, updatedAt: new Date().toISOString() }));
  }

  function raiseEscalation() {
    if (!selected) return;

    const escalations = readSupervisorEscalations();
    const alerts = readSupervisorAlerts();
    const created = createSupervisorEscalation({
      agentId: selected.id,
      agentName: selected.name,
      campaignId: selected.campaignId,
      campaignName: selected.campaignName,
      severity: "high",
      status: "new",
      reason: "Raised manually from activity monitor",
      customer: `${selected.name} portfolio customer`,
      owner: "Supervisor Queue",
      slaMinutes: 20,
      notes: ["Generated from Team Activity panel"],
    });

    const nextEscalations = [created, ...escalations];
    writeSupervisorEscalations(nextEscalations);

    const nextAlerts = [
      createSupervisorAlert({
        type: "escalation",
        title: "Escalation raised from activity monitor",
        message: `${selected.name} has a new high-severity escalation.`,
        relatedId: created.id,
        read: false,
        pinned: false,
        snoozedUntil: null,
      }),
      ...alerts,
    ];
    writeSupervisorAlerts(nextAlerts);

    updateTeamItem(selected.id, (item) => ({ ...item, escalationsToday: item.escalationsToday + 1, updatedAt: new Date().toISOString() }));
    setMessage(`Escalation created for ${selected.name} and synced to Escalations + Alerts.`);
  }

  return (
    <SupervisorScreenShell
      activeKey="activity"
      contextLabel="Team Activity"
      eyebrow="Supervisor / Live Team Monitor"
      title="Team Activity Monitor"
      description="Track live agent activity, adjust in-session states, and escalate directly from the monitoring lane."
    >
      <p className="mb-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>

      <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Live Call Visibility</div>
            <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Agents On Live Calls</h2>
          </div>
          <Badge color="primary">{activeLiveCalls.length} live</Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {activeLiveCalls.map((call) => {
            const matchingTeamAgent = team.find((agent) => agent.id === call.agentId);
            return (
              <button key={call.id} type="button" onClick={() => router.push(`/supervisor/call/${call.id}`)} className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3 text-left transition-colors hover:bg-white/[0.05]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-white">{call.agentName}</div>
                    <div className="mt-1 text-[12px] text-white/50">{call.campaignName}</div>
                  </div>
                  <Badge color={call.status === "escalated" ? "danger" : call.status === "at-risk" ? "tertiary" : "success"}>{call.status.toUpperCase()}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-white/58">
                  <span>{formatLiveCallDuration(call.duration)}</span>
                  <span>Risk {call.riskScore}%</span>
                  <span>Node {call.currentScriptNode}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] text-white/46">{matchingTeamAgent ? matchingTeamAgent.region : "Active now"}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/68">View Live Call</span>
                </div>
              </button>
            );
          })}
          {activeLiveCalls.length === 0 ? <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62">No live calls are running right now.</div> : null}
        </div>
      </Card>

      <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agent or region" className={inputClass} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | AgentLiveStatus)} className={inputClass}>
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)} className={inputClass}>
            <option value="all">All campaigns</option>
            {campaignOptions.map((campaign) => (
              <option key={campaign} value={campaign}>{campaign}</option>
            ))}
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "utilization" | "calls" | "escalations")} className={inputClass}>
            <option value="utilization">Sort by utilization</option>
            <option value="calls">Sort by active calls</option>
            <option value="escalations">Sort by escalations</option>
          </select>
          <button type="button" onClick={() => setSortBy((current) => (current === "utilization" ? "calls" : current === "calls" ? "escalations" : "utilization"))} className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[12px] border border-white/12 bg-white/[0.02] text-[12px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:bg-white/[0.05]">
            <ArrowUpDown size={14} strokeWidth={2.1} aria-hidden="true" />
            Quick Sort
          </button>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Live Agent Queue</h2>
            <Badge color="neutral">{filteredTeam.length} visible</Badge>
          </div>
          <div className="space-y-2.5">
            {filteredTeam.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={["w-full rounded-[13px] border p-3 text-left transition-colors", selected?.id === item.id ? "border-[#b9b7ff]/28 bg-[#b9b7ff]/10" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"].join(" ")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-white">{item.name}</div>
                    <div className="mt-1 text-[12px] text-white/50">{item.region} • {item.campaignName}</div>
                  </div>
                  <Badge color={item.sentiment === "Negative" ? "danger" : item.sentiment === "Neutral" ? "tertiary" : "success"}>{item.sentiment}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px] text-white/58">
                  <span className="inline-flex items-center gap-2"><StatusDot status={item.status} /> {item.status}</span>
                  <span>Calls {item.activeCalls}</span>
                  <span>Esc {item.escalationsToday}</span>
                  <span>Util {item.utilization}%</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          {selected ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Agent Detail</div>
                  <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">{selected.name}</h2>
                </div>
                <Badge color="primary">{selected.campaignName}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[12px] text-white/60">
                <div className={mini}>Active calls: {selected.activeCalls}</div>
                <div className={mini}>Utilization: {selected.utilization}%</div>
                <div className={mini}>Escalations: {selected.escalationsToday}</div>
                <div className={mini}>Sentiment: {selected.sentiment}</div>
              </div>

              <textarea value={selected.note} onChange={(event) => updateNote(event.target.value)} className="mt-3 h-24 w-full rounded-[12px] border border-white/[0.08] bg-[#191c28] px-3 py-2 text-[13px] text-white/84 outline-none focus:border-[#b9b7ff]/40" />

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={cycleStatus} className={ghostBtn}>Cycle Status</button>
                <button type="button" onClick={raiseEscalation} className={solidBtn}><Siren size={13} /> Raise Escalation</button>
                <button type="button" onClick={() => adjustCalls(1)} className={ghostBtn}><Plus size={13} /> Add Call</button>
                <button type="button" onClick={() => adjustCalls(-1)} className={ghostBtn}>Reduce Call</button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/supervisor/escalations" className={linkBtn}>Open Escalations</Link>
                <Link href="/supervisor/performance" className={linkBtn}>Open Performance</Link>
              </div>

              {selected ? (
                <div className="mt-3 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3">
                  {liveCallByAgentId.get(selected.id) ? (
                    <Link href={`/supervisor/call/${liveCallByAgentId.get(selected.id)?.id}`} className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#8fdde0]/20 bg-[#8fdde0]/10 px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#bfe9eb] hover:bg-[#8fdde0]/16">
                      View Live Call
                    </Link>
                  ) : (
                    <div className="text-[12px] text-white/52">No live call is attached to this agent yet.</div>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62">No agent matches the current filters.</div>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Link href="/supervisor" className="inline-flex items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.11em] text-white/76 hover:bg-white/[0.06]">
          <UserRound size={14} strokeWidth={2.1} aria-hidden="true" />
          Back to Supervisor Dashboard
        </Link>
      </div>
    </SupervisorScreenShell>
  );
}

const inputClass = "h-[46px] rounded-[12px] border border-white/[0.08] bg-[#191c28] px-3 text-[13px] text-white/84 outline-none focus:border-[#b9b7ff]/40";
const mini = "rounded-[11px] border border-white/[0.06] bg-white/[0.02] px-3 py-2";
const ghostBtn = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const solidBtn = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#b9b7ff] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#20264b] hover:bg-[#c8c6ff]";
const linkBtn = "inline-flex h-10 items-center justify-center rounded-[10px] border border-white/12 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-[0.1em] text-white/76 hover:bg-white/[0.06]";
