"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, LockKeyhole, RefreshCw, Search, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { AdminMessage, AdminPanel, AdminScreenShell, AdminSelectField, AdminStatCard, SectionTitle } from "@/components/admin/AdminScreenShell";
import { Badge } from "@/components/ui/ui-components";
import { apiGet } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

type SecurityEvent = { id: string; event: string; user_email: string; severity: "info" | "warning"; context: string; created_at: string };
type User = { id: string; name: string; email: string; role: string; status: string };
const severityOptions = ["All Events", "Info", "Warning"] as const;

export default function SecurityAccessPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<(typeof severityOptions)[number]>("All Events");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [message, setMessage] = useState("Loading persisted security audit data.");
  const load = useCallback(async () => {
    try {
      const token = getStoredAuthToken();
      const [nextEvents, nextUsers] = await Promise.all([
        apiGet<SecurityEvent[]>("/api/admin/users/events", token),
        apiGet<User[]>("/api/admin/users", token),
      ]);
      setEvents(nextEvents);
      setUsers(nextUsers);
      setSelectedEventId((current) => current || nextEvents[0]?.id || null);
      setMessage("Audit events and account states are synced with the backend.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load security audit data.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const filteredEvents = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    return events.filter((item) => {
      const matchesQuery = !searchText || [item.event, item.user_email, item.severity, item.context].some((value) => value.toLowerCase().includes(searchText));
      const matchesSeverity = severityFilter === "All Events" || item.severity === severityFilter.toLowerCase();
      return matchesQuery && matchesSeverity;
    });
  }, [events, query, severityFilter]);
  const selectedEvent = filteredEvents.find((item) => item.id === selectedEventId) || filteredEvents[0] || null;
  const inactiveUsers = users.filter((user) => user.status !== "active");

  return <AdminScreenShell activeKey="security" contextLabel="Security" eyebrow="Admin Security / Access Control" title="Security & Access" description="Review persisted account state and the operational audit trail. Account changes and password resets are managed from User Management.">
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminStatCard label="Inactive Accounts" value={String(inactiveUsers.length).padStart(2, "0")} accent="text-[#f6c56f]" icon={<LockKeyhole size={17} />} />
      <AdminStatCard label="Active Accounts" value={String(users.filter((user) => user.status === "active").length).padStart(2, "0")} accent="text-[#a7f3c4]" icon={<Users size={17} />} />
      <AdminStatCard label="Audit Events" value={String(events.length).padStart(2, "0")} accent="text-[#8fdde0]" icon={<ShieldAlert size={17} />} />
      <AdminStatCard label="Access Policy" value="Enforced" accent="text-[#b9b7ff]" icon={<ShieldCheck size={17} />} />
    </div>
    <AdminMessage>{message}</AdminMessage>
    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px_auto]"><label className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search audit events..." className="h-[42px] w-full rounded-[10px] border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-4 text-[13px] text-white outline-none placeholder:text-white/35" /></label><AdminSelectField label="Severity" value={severityFilter} options={severityOptions} onChange={setSeverityFilter} /><button type="button" onClick={() => void load()} className={buttonClass}><RefreshCw size={14} /> Refresh</button></div>
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <AdminPanel><div className="mb-5 flex items-center justify-between"><SectionTitle eyebrow="Audit Trail" title="Recent security events" /><Badge color="neutral">{filteredEvents.length} events</Badge></div><div className="space-y-3">{filteredEvents.map((item) => <button key={item.id} type="button" onClick={() => setSelectedEventId(item.id)} className={["flex w-full flex-wrap items-center justify-between gap-3 rounded-[15px] border p-4 text-left", selectedEvent?.id === item.id ? "border-[#b9b7ff]/24 bg-[#b9b7ff]/8" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]"].join(" ")}><div><div className="font-semibold text-white">{item.event}</div><div className="mt-1 text-[12px] text-white/44">{item.user_email} / {new Date(item.created_at).toLocaleString()}</div></div><Badge color={item.severity === "warning" ? "tertiary" : "primary"}>{item.severity.toUpperCase()}</Badge></button>)}{!filteredEvents.length ? <div className={empty}>No persisted security events match this filter yet.</div> : null}</div></AdminPanel>
      <div className="space-y-4"><AdminPanel glow><SectionTitle eyebrow="Event Detail" title="Selected record" />{selectedEvent ? <div className="mt-4 rounded-[15px] border border-[#b9b7ff]/18 bg-[#b9b7ff]/8 p-4"><div className="font-semibold text-white">{selectedEvent.event}</div><div className="mt-2 text-[12px] text-white/44">{selectedEvent.user_email} / {new Date(selectedEvent.created_at).toLocaleString()}</div><p className="mt-3 text-[13px] leading-6 text-white/60">{selectedEvent.context}</p></div> : <div className={empty}>Select an event to inspect its retained context.</div>}</AdminPanel><AdminPanel><SectionTitle eyebrow="Account Controls" title="Manage account access" /><p className="mt-3 text-[13px] leading-6 text-white/60">{inactiveUsers.length ? `${inactiveUsers.length} account${inactiveUsers.length === 1 ? " is" : "s are"} inactive or locked.` : "All workspace accounts are active."} Change an account status or issue a password reset from User Management. Server access checks enforce the saved account status.</p><Link href="/admin/users" className="mt-4 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#b9b7ff] px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#20264b] hover:bg-[#c8c6ff]"><Activity size={14} /> Open User Management</Link></AdminPanel></div>
    </div>
  </AdminScreenShell>;
}

const buttonClass = "inline-flex h-[42px] items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const empty = "rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62";
