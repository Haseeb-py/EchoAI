"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { SupervisorScreenShell } from "@/components/supervisor/SupervisorScreenShell";
import { Badge, Card } from "@/components/ui/ui-components";
import {
  createSupervisorAlert,
  readSupervisorAlerts,
  readSupervisorEscalations,
  writeSupervisorAlerts,
  writeSupervisorEscalations,
  type EscalationItem,
  type EscalationSeverity,
  type EscalationStatus,
} from "@/lib/supervisor-state";

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState(readSupervisorEscalations);
  const [alerts, setAlerts] = useState(readSupervisorAlerts);
  const [statusFilter, setStatusFilter] = useState<"all" | EscalationStatus>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | EscalationSeverity>("all");
  const [sortBy, setSortBy] = useState<"severity" | "sla">("severity");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [message, setMessage] = useState("Escalation workflow is fully interactive.");

  useEffect(() => {
    const nextEscalations = readSupervisorEscalations();
    setEscalations(nextEscalations);
    setSelectedId(nextEscalations[0]?.id ?? null);
    setAlerts(readSupervisorAlerts());
  }, []);

  useEffect(() => {
    writeSupervisorEscalations(escalations);
  }, [escalations]);

  useEffect(() => {
    writeSupervisorAlerts(alerts);
  }, [alerts]);

  const filtered = useMemo(() => {
    const rank = { critical: 4, high: 3, medium: 2, low: 1 } as const;
    return escalations
      .filter((item) => (statusFilter === "all" ? true : item.status === statusFilter))
      .filter((item) => (severityFilter === "all" ? true : item.severity === severityFilter))
      .sort((a, b) => {
        if (sortBy === "sla") return a.slaMinutes - b.slaMinutes;
        return rank[b.severity] - rank[a.severity];
      });
  }, [escalations, statusFilter, severityFilter, sortBy]);

  const selected = filtered.find((item) => item.id === selectedId) || filtered[0] || null;

  function updateEscalation(id: string, updater: (item: EscalationItem) => EscalationItem) {
    setEscalations((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  }

  function createWorkflowAlert(text: string, relatedId: string) {
    setAlerts((current) => [
      createSupervisorAlert({
        type: "escalation",
        title: "Escalation workflow updated",
        message: text,
        relatedId,
        read: false,
        pinned: false,
        snoozedUntil: null,
      }),
      ...current,
    ]);
  }

  function setStatus(status: EscalationStatus) {
    if (!selected) return;
    updateEscalation(selected.id, (item) => ({ ...item, status, updatedAt: new Date().toISOString() }));
    createWorkflowAlert(`${selected.customer} escalation moved to ${status}.`, selected.id);
    setMessage(`${selected.customer} status updated to ${status}.`);
  }

  function assignOwner(owner: string) {
    if (!selected) return;
    updateEscalation(selected.id, (item) => ({ ...item, owner, updatedAt: new Date().toISOString() }));
    setMessage(`${selected.customer} assigned to ${owner}.`);
  }

  function addNote(event: FormEvent) {
    event.preventDefault();
    if (!selected || !noteDraft.trim()) return;
    const clean = noteDraft.trim();
    updateEscalation(selected.id, (item) => ({ ...item, notes: [clean, ...item.notes], updatedAt: new Date().toISOString() }));
    setNoteDraft("");
    setMessage("Escalation note added.");
  }

  return (
    <SupervisorScreenShell
      activeKey="escalations"
      contextLabel="Escalations"
      eyebrow="Supervisor / Risk Triage"
      title="Escalations Panel"
      description="Acknowledge, resolve, and track escalation ownership with live local-state workflow updates."
    >
      <p className="mb-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>

      <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | EscalationStatus)} className={inputClass}>
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as "all" | EscalationSeverity)} className={inputClass}>
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "severity" | "sla")} className={inputClass}>
            <option value="severity">Sort by severity</option>
            <option value="sla">Sort by SLA</option>
          </select>
          <button type="button" onClick={() => setSortBy((current) => (current === "severity" ? "sla" : "severity"))} className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[12px] border border-white/12 bg-white/[0.02] text-[12px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:bg-white/[0.05]">
            <RefreshCw size={14} strokeWidth={2.1} />
            Toggle Sort
          </button>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Escalation Queue</h2>
            <Badge color="neutral">{filtered.length} items</Badge>
          </div>
          <div className="space-y-2.5">
            {filtered.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={["w-full rounded-[13px] border p-3 text-left transition-colors", selected?.id === item.id ? "border-[#b9b7ff]/28 bg-[#b9b7ff]/10" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"].join(" ")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-white">{item.customer}</div>
                    <div className="mt-1 text-[12px] text-white/50">{item.reason}</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge color={item.severity === "critical" ? "danger" : item.severity === "high" ? "tertiary" : "neutral"}>{item.severity.toUpperCase()}</Badge>
                    <Badge color={item.status === "resolved" ? "success" : item.status === "acknowledged" ? "primary" : "neutral"}>{item.status.toUpperCase()}</Badge>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-white/58">
                  <span>{item.agentName}</span>
                  <span>{item.campaignName}</span>
                  <span>Owner: {item.owner}</span>
                  <span>SLA {item.slaMinutes}m</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          {selected ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">{selected.customer}</h2>
                <Badge color="primary">{selected.id}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[12px] text-white/60">
                <div className={mini}>Agent: {selected.agentName}</div>
                <div className={mini}>Campaign: {selected.campaignName}</div>
                <div className={mini}>Severity: {selected.severity}</div>
                <div className={mini}>Status: {selected.status}</div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setStatus("acknowledged")} className={ghostBtn}>Acknowledge</button>
                <button type="button" onClick={() => setStatus("resolved")} className={solidBtn}><CheckCircle2 size={13} /> Resolve</button>
                <button type="button" onClick={() => setStatus("new")} className={ghostBtn}>Reopen</button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => assignOwner("Hamza Malik")} className={ghostBtn}>Assign Hamza</button>
                <button type="button" onClick={() => assignOwner("Sana Javed")} className={ghostBtn}>Assign Sana</button>
              </div>

              <form onSubmit={addNote} className="mt-3">
                <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Add escalation note" className="h-20 w-full rounded-[12px] border border-white/[0.08] bg-[#191c28] px-3 py-2 text-[13px] text-white/84 outline-none focus:border-[#b9b7ff]/40" />
                <button type="submit" className="mt-2 inline-flex h-9 items-center justify-center rounded-[10px] bg-[#b9b7ff] px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#20264b] hover:bg-[#c8c6ff]">Add Note</button>
              </form>

              <div className="mt-3 max-h-[150px] space-y-2 overflow-y-auto rounded-[11px] border border-white/[0.06] bg-white/[0.02] p-3">
                {selected.notes.map((note, index) => (
                  <div key={`${selected.id}-${index}`} className="text-[12px] text-white/62">• {note}</div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/supervisor/activity" className={linkBtn}>Open Activity</Link>
                <Link href="/supervisor/alerts" className={linkBtn}>Open Alerts</Link>
              </div>
            </>
          ) : (
            <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62">No escalation matches current filters.</div>
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
const linkBtn = "inline-flex h-10 items-center justify-center rounded-[10px] border border-white/12 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-[0.1em] text-white/76 hover:bg-white/[0.06]";
