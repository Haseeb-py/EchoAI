"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, UserRound } from "lucide-react";
import { SupervisorScreenShell } from "@/components/supervisor/SupervisorScreenShell";
import { Badge, Card } from "@/components/ui/ui-components";
import { apiGet, apiPost } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

type EscalationEvent = {
  id: string;
  actor_id: string;
  action: string;
  note: string;
  created_at: string;
};

type EscalationAlert = {
  id: string;
  call_id: string;
  campaign_id: string;
  reason: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "new" | "acknowledged" | "resolved";
  takeover_requested: boolean;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_note: string;
  created_at: string;
  events: EscalationEvent[];
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not yet";
}

export default function EscalationsPage() {
  const [alerts, setAlerts] = useState<EscalationAlert[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | EscalationAlert["status"]>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | EscalationAlert["severity"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("Loading persisted escalation queue.");
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await apiGet<EscalationAlert[]>("/api/supervisor/alerts", getStoredAuthToken());
      setAlerts(data);
      setSelectedId((current) => current || data[0]?.id || null);
      setMessage(data.length ? "Escalation queue synced with the backend." : "No persisted escalations are waiting for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load escalation queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
  }, []);

  const filtered = useMemo(() => alerts
    .filter((alert) => statusFilter === "all" || alert.status === statusFilter)
    .filter((alert) => severityFilter === "all" || alert.severity === severityFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [alerts, severityFilter, statusFilter]);
  const selected = filtered.find((alert) => alert.id === selectedId) || filtered[0] || null;

  const takeAction = async (action: "acknowledge" | "resolve" | "takeover") => {
    if (!selected) return;
    try {
      const updated = await apiPost<EscalationAlert>(`/api/supervisor/alerts/${selected.id}/${action}`, { note: note.trim() }, getStoredAuthToken());
      setAlerts((current) => current.map((alert) => alert.id === selected.id ? { ...alert, ...updated, events: alert.events } : alert));
      setNote("");
      setMessage(`Escalation ${action === "resolve" ? "resolved" : action === "takeover" ? "marked for takeover" : "acknowledged"}.`);
      await loadAlerts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update escalation.");
    }
  };

  return (
    <SupervisorScreenShell activeKey="escalations" contextLabel="Escalations" eyebrow="Supervisor / Risk Triage" title="Escalations Panel" description="Review persisted alerts, acknowledge risk, request takeover, and keep an auditable resolution trail.">
      <p className="mb-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>
      <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={inputClass}>
            <option value="all">All statuses</option><option value="new">New</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option>
          </select>
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)} className={inputClass}>
            <option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
          <button type="button" onClick={() => void loadAlerts()} className={ghostBtn}><RefreshCw size={14} /> Refresh Queue</button>
        </div>
      </Card>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Escalation Queue</h2><Badge color="neutral">{filtered.length} items</Badge></div>
          <div className="space-y-2.5">
            {loading ? <div className={empty}>Loading alerts...</div> : null}
            {!loading && !filtered.length ? <div className={empty}>No escalation matches these filters.</div> : null}
            {filtered.map((alert) => <button key={alert.id} type="button" onClick={() => setSelectedId(alert.id)} className={["w-full rounded-[13px] border p-3 text-left transition-colors", selected?.id === alert.id ? "border-[#b9b7ff]/28 bg-[#b9b7ff]/10" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"].join(" ")}>
              <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[15px] font-semibold text-white">{alert.reason}</div><div className="mt-1 text-[12px] text-white/50">Call {alert.call_id}</div></div><div className="flex gap-2"><Badge color={alert.severity === "critical" ? "danger" : alert.severity === "high" ? "tertiary" : "neutral"}>{alert.severity.toUpperCase()}</Badge><Badge color={alert.status === "resolved" ? "success" : alert.status === "acknowledged" ? "primary" : "neutral"}>{alert.status.toUpperCase()}</Badge></div></div>
              <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-white/58"><span>Campaign {alert.campaign_id}</span><span>{formatDate(alert.created_at)}</span>{alert.takeover_requested ? <span className="text-[#f8dc9b]">Takeover requested</span> : null}</div>
            </button>)}
          </div>
        </Card>
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          {selected ? <><div className="mb-4 flex items-center justify-between"><h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Alert Detail</h2><Badge color="primary">{selected.id.slice(0, 8)}</Badge></div>
            <div className="grid grid-cols-2 gap-2 text-[12px] text-white/60"><div className={mini}>Status: {selected.status}</div><div className={mini}>Severity: {selected.severity}</div><div className={mini}>Acknowledged: {formatDate(selected.acknowledged_at)}</div><div className={mini}>Resolved: {formatDate(selected.resolved_at)}</div></div>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional acknowledgement or resolution note" className="mt-3 h-20 w-full rounded-[12px] border border-white/[0.08] bg-[#191c28] px-3 py-2 text-[13px] text-white/84 outline-none focus:border-[#b9b7ff]/40" />
            <div className="mt-3 grid grid-cols-3 gap-2"><button type="button" disabled={selected.status !== "new"} onClick={() => void takeAction("acknowledge")} className={ghostBtn}>Acknowledge</button><button type="button" disabled={selected.status === "resolved"} onClick={() => void takeAction("takeover")} className={ghostBtn}><UserRound size={13} /> Takeover</button><button type="button" disabled={selected.status === "resolved"} onClick={() => void takeAction("resolve")} className={solidBtn}><CheckCircle2 size={13} /> Resolve</button></div>
            <div className="mt-3 max-h-[180px] space-y-2 overflow-y-auto rounded-[11px] border border-white/[0.06] bg-white/[0.02] p-3">{selected.events.length ? selected.events.map((event) => <div key={event.id} className="text-[12px] text-white/62"><span className="font-semibold text-white/80">{event.action}</span> {event.note ? `- ${event.note}` : ""}<div className="mt-1 text-[10px] text-white/35">{formatDate(event.created_at)}</div></div>) : <div className="text-[12px] text-white/48">No supervisor actions have been recorded yet.</div>}</div>
          </> : <div className={empty}>Select an escalation to review its detail.</div>}
        </Card>
      </div>
    </SupervisorScreenShell>
  );
}

const inputClass = "h-[46px] rounded-[12px] border border-white/[0.08] bg-[#191c28] px-3 text-[13px] text-white/84 outline-none focus:border-[#b9b7ff]/40";
const mini = "rounded-[11px] border border-white/[0.06] bg-white/[0.02] px-3 py-2";
const ghostBtn = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35";
const solidBtn = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#b9b7ff] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#20264b] hover:bg-[#c8c6ff] disabled:cursor-not-allowed disabled:opacity-35";
const empty = "rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62";
