"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, Clock3, Pin, Trash2 } from "lucide-react";
import { SupervisorScreenShell } from "@/components/supervisor/SupervisorScreenShell";
import { Badge, Card } from "@/components/ui/ui-components";
import { readSupervisorAlerts, writeSupervisorAlerts, type AlertItem, type AlertType } from "@/lib/supervisor-state";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(readSupervisorAlerts);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AlertType>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("Alerts support read, pin, snooze, and clear actions.");

  useEffect(() => {
    const next = readSupervisorAlerts();
    setAlerts(next);
    setSelectedId(next[0]?.id ?? null);
  }, []);

  useEffect(() => {
    writeSupervisorAlerts(alerts);
  }, [alerts]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return alerts
      .filter((item) => (typeFilter === "all" ? true : item.type === typeFilter))
      .filter((item) => (unreadOnly ? !item.read : true))
      .filter((item) => (!text ? true : [item.title, item.message].some((part) => part.toLowerCase().includes(text))))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [alerts, query, typeFilter, unreadOnly]);

  const selected = filtered.find((item) => item.id === selectedId) || filtered[0] || null;
  const unreadCount = alerts.filter((item) => !item.read).length;

  function updateAlert(id: string, updater: (item: AlertItem) => AlertItem) {
    setAlerts((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  }

  function removeAlert(id: string) {
    setAlerts((current) => current.filter((item) => item.id !== id));
    setSelectedId((current) => (current === id ? null : current));
    setMessage("Alert removed from queue.");
  }

  function markAllRead() {
    setAlerts((current) => current.map((item) => ({ ...item, read: true })));
    setMessage("All alerts marked as read.");
  }

  return (
    <SupervisorScreenShell
      activeKey="alerts"
      contextLabel="Alerts"
      eyebrow="Supervisor / Notification Center"
      title="Alerts and Notifications"
      description="Review operational alerts, apply queue actions, and persist triage decisions for later sessions."
    >
      <p className="mb-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>

      <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search alerts" className={inputClass} />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} className={inputClass}>
            <option value="all">All types</option>
            <option value="escalation">Escalation</option>
            <option value="campaign">Campaign</option>
            <option value="performance">Performance</option>
            <option value="system">System</option>
          </select>
          <button type="button" onClick={() => setUnreadOnly((current) => !current)} className="inline-flex h-[46px] items-center justify-center rounded-[12px] border border-white/12 bg-white/[0.02] text-[12px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:bg-white/[0.05]">
            {unreadOnly ? "Unread Only" : "Show Unread"}
          </button>
          <button type="button" onClick={markAllRead} className="inline-flex h-[46px] items-center justify-center rounded-[12px] border border-white/12 bg-white/[0.02] text-[12px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:bg-white/[0.05]">
            Mark All Read
          </button>
          <div className="inline-flex h-[46px] items-center justify-center rounded-[12px] border border-white/[0.08] bg-[#191c28] text-[12px] font-semibold uppercase tracking-[0.1em] text-white/72">Unread {unreadCount}</div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Alert Feed</h2>
            <Badge color="neutral">{filtered.length} alerts</Badge>
          </div>
          <div className="space-y-2.5">
            {filtered.map((alert) => (
              <button key={alert.id} type="button" onClick={() => setSelectedId(alert.id)} className={["w-full rounded-[13px] border p-3 text-left transition-colors", selected?.id === alert.id ? "border-[#b9b7ff]/28 bg-[#b9b7ff]/10" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"].join(" ")}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-white">{alert.title}</div>
                    <div className="mt-1 text-[12px] text-white/50">{alert.message}</div>
                  </div>
                  <div className="flex gap-2">
                    {alert.pinned ? <Badge color="tertiary">PINNED</Badge> : null}
                    <Badge color={alert.read ? "neutral" : "primary"}>{alert.read ? "READ" : "NEW"}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          {selected ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Alert Detail</h2>
                <Badge color="primary">{selected.type.toUpperCase()}</Badge>
              </div>

              <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3 text-[13px] text-white/70">
                <div className="font-semibold text-white">{selected.title}</div>
                <div className="mt-2 text-white/60">{selected.message}</div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.1em] text-white/40">{selected.createdAt}</div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => updateAlert(selected.id, (item) => ({ ...item, read: !item.read }))} className={ghostBtn}>{selected.read ? "Mark Unread" : "Mark Read"}</button>
                <button type="button" onClick={() => updateAlert(selected.id, (item) => ({ ...item, pinned: !item.pinned }))} className={ghostBtn}><Pin size={13} /> {selected.pinned ? "Unpin" : "Pin"}</button>
                <button type="button" onClick={() => updateAlert(selected.id, (item) => ({ ...item, snoozedUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString() }))} className={ghostBtn}><Clock3 size={13} /> Snooze 1h</button>
                <button type="button" onClick={() => removeAlert(selected.id)} className={dangerBtn}><Trash2 size={13} /> Clear Alert</button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/supervisor/escalations" className={linkBtn}>Open Escalations</Link>
                <Link href="/supervisor/campaigns" className={linkBtn}>Open Campaigns</Link>
              </div>
            </>
          ) : (
            <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62">No alerts available for current filter.</div>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Link href="/supervisor" className="inline-flex items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.11em] text-white/76 hover:bg-white/[0.06]">
          <Bell size={14} /> Back to Overview
        </Link>
      </div>
    </SupervisorScreenShell>
  );
}

const inputClass = "h-[46px] rounded-[12px] border border-white/[0.08] bg-[#191c28] px-3 text-[13px] text-white/84 outline-none focus:border-[#b9b7ff]/40";
const ghostBtn = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const dangerBtn = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-red-300/20 bg-red-500/10 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-red-200 hover:bg-red-500/20";
const linkBtn = "inline-flex h-10 items-center justify-center rounded-[10px] border border-white/12 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-[0.1em] text-white/76 hover:bg-white/[0.06]";
