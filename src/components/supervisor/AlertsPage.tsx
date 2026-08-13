"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, RefreshCw, Siren } from "lucide-react";
import { SupervisorScreenShell } from "@/components/supervisor/SupervisorScreenShell";
import { Badge, Card } from "@/components/ui/ui-components";
import { apiGet } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";
import { useSupervisorRefreshSeconds } from "@/components/supervisor/useSupervisorRefreshSeconds";

type Alert = { id: string; call_id: string; campaign_id: string; reason: string; severity: "critical" | "high" | "medium" | "low"; status: "new" | "acknowledged" | "resolved"; takeover_requested: boolean; created_at: string; acknowledged_at: string | null; resolved_at: string | null; resolution_note: string };

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | Alert["status"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("Loading persisted supervisor alerts.");
  const refreshSeconds = useSupervisorRefreshSeconds();

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Alert[]>("/api/supervisor/alerts", getStoredAuthToken());
      setAlerts(data);
      setSelectedId((current) => current || data[0]?.id || null);
      setMessage(data.length ? "Alerts are sourced from persisted escalation events." : "No persisted escalation alerts are available.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load supervisor alerts.");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), refreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [load, refreshSeconds]);

  const filtered = useMemo(() => alerts.filter((alert) => statusFilter === "all" || alert.status === statusFilter).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [alerts, statusFilter]);
  const selected = filtered.find((alert) => alert.id === selectedId) || filtered[0] || null;
  const openCount = alerts.filter((alert) => alert.status !== "resolved").length;

  return <SupervisorScreenShell activeKey="alerts" contextLabel="Alerts" eyebrow="Supervisor / Notification Center" title="Alerts and Notifications" description="Persisted escalation notifications with an auditable acknowledgement and resolution workflow.">
    <p className="mb-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>
    <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={inputClass}><option value="all">All statuses</option><option value="new">New</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option></select><div className="inline-flex h-[42px] items-center justify-center rounded-[10px] border border-white/[0.08] bg-[#191c28] px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/72">{openCount} unresolved</div><button type="button" onClick={() => void load()} className={buttonClass}><RefreshCw size={14} /> Refresh</button></div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]"><Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Alert feed</h2><Badge color="neutral">{filtered.length} alerts</Badge></div><div className="space-y-2.5">{filtered.map((alert) => <button key={alert.id} type="button" onClick={() => setSelectedId(alert.id)} className={["w-full rounded-[13px] border p-3 text-left transition-colors", selected?.id === alert.id ? "border-[#b9b7ff]/28 bg-[#b9b7ff]/10" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"].join(" ")}><div className="flex items-start justify-between gap-3"><div><div className="text-[13px] font-semibold text-white">{alert.reason}</div><div className="mt-1 text-[11px] text-white/48">{new Date(alert.created_at).toLocaleString()} / Call {alert.call_id.slice(0, 8)}</div></div><div className="flex gap-2"><Badge color={alert.severity === "critical" ? "danger" : alert.severity === "high" ? "tertiary" : "primary"}>{alert.severity.toUpperCase()}</Badge><Badge color={alert.status === "resolved" ? "success" : alert.status === "acknowledged" ? "primary" : "neutral"}>{alert.status.toUpperCase()}</Badge></div></div></button>)}{!filtered.length ? <div className={empty}>No alerts match this status filter.</div> : null}</div></Card>
      <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">{selected ? <><div className="mb-4 flex items-center justify-between"><h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Alert detail</h2><Siren className="text-[#f6c56f]" size={21} /></div><div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3 text-[13px] text-white/70"><div className="font-semibold text-white">{selected.reason}</div><div className="mt-3 space-y-2 text-[12px] text-white/58"><div>Severity: {selected.severity}</div><div>Status: {selected.status}</div><div>Takeover: {selected.takeover_requested ? "requested" : "not requested"}</div><div>Created: {new Date(selected.created_at).toLocaleString()}</div>{selected.resolution_note ? <div>Resolution: {selected.resolution_note}</div> : null}</div></div><Link href="/supervisor/escalations" className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#b9b7ff] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#20264b] hover:bg-[#c8c6ff]"><Siren size={14} /> Open escalation workflow</Link></> : <div className={empty}>Select an alert to inspect its persisted details.</div>}</Card></div>
    <div className="mt-4"><Link href="/supervisor" className={buttonClass}><Bell size={14} /> Back to overview</Link></div>
  </SupervisorScreenShell>;
}

const inputClass = "h-[42px] rounded-[10px] border border-white/[0.08] bg-[#191c28] px-3 text-[13px] text-white/84 outline-none focus:border-[#b9b7ff]/40";
const buttonClass = "inline-flex h-[42px] items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const empty = "rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62";
