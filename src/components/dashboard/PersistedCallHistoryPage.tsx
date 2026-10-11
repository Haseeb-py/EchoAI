"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AgentScreenShell } from "@/components/dashboard/AgentScreenShell";
import { Badge, Card, SearchInput } from "@/components/ui/ui-components";
import { apiGet } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

type Sales = { objection_count: number; primary_objection: string; buying_signal_count: number; highest_buying_signal: string; commitment_confirmed: boolean };
type CompletedCall = { id: string; campaign_name: string; lead_name: string; status: string; completed_at: string | null; summary: string; sales?: Sales | null; cognitive?: { customer_experience: string; primary_intent: string } | null };

export default function PersistedCallHistoryPage() {
  const [calls, setCalls] = useState<CompletedCall[]>([]); const [query, setQuery] = useState(""); const [message, setMessage] = useState("Loading completed calls from the backend.");
  const load = async () => { try { const data = await apiGet<CompletedCall[]>("/api/calls?status_filter=terminal", getStoredAuthToken()); setCalls(data); setMessage(data.length ? "Terminal call history is synced with persisted analysis." : "No completed or disconnected calls are available yet."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load completed calls."); } };
  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => { const text = query.trim().toLowerCase(); return calls.filter((call) => !text || [call.lead_name, call.campaign_name, call.summary].some((value) => value.toLowerCase().includes(text))); }, [calls, query]);
  return <AgentScreenShell activeKey="history" contextLabel="Call History" eyebrow="Agent / Post-call Intelligence" title="Call History" description="Review persisted transcripts, cognitive outcomes, and sales signals.">
    <p className="mb-4 rounded-[12px] border border-white/[.06] bg-white/[.025] px-4 py-3 text-[12px] text-white/60">{message}</p>
    <Card className="!rounded-[18px] !border-white/[.06] !bg-[#111420] !p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/38">Persisted records</div><h2 className="mt-1 text-[28px] font-semibold text-white">Completed calls</h2></div><button type="button" onClick={() => void load()} className={buttonClass}><RefreshCw size={14} /> Refresh</button></div><div className="mt-4 max-w-[380px]"><SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search history..." /></div><div className="mt-4 space-y-3">{filtered.map((call) => <Link key={call.id} href={`/dashboard/call/${call.id}`} className="block rounded-[14px] border border-white/[.06] bg-white/[.025] p-4 hover:bg-white/[.04]"><div className="flex flex-wrap justify-between gap-3"><div><div className="text-[16px] font-semibold text-white">{call.lead_name}</div><div className="mt-1 text-[12px] text-white/48">{call.campaign_name}</div></div><Badge color="primary">{call.status.toUpperCase()}</Badge></div><div className="mt-3 flex flex-wrap gap-2 text-[11px]">{call.cognitive ? <span className="rounded bg-[#b9b7ff]/10 px-2 py-1 text-[#d7d5ff]">Experience: {call.cognitive.customer_experience}</span> : null}{call.sales ? <><span className="rounded bg-[#f6c56f]/10 px-2 py-1 text-[#f8dc9b]">Objection: {call.sales.primary_objection.replaceAll("_", " ")}</span><span className="rounded bg-[#f6c56f]/10 px-2 py-1 text-[#f8dc9b]">Signal: {call.sales.highest_buying_signal}</span></> : null}</div><div className="mt-3 flex justify-between text-[12px] text-white/48"><span>{call.completed_at ? new Date(call.completed_at).toLocaleString() : "End time unavailable"}</span><span className="text-[#8fdde0]">Open full transcript →</span></div></Link>)}{!filtered.length ? <div className="rounded-[12px] border border-white/[.06] bg-white/[.02] p-4 text-[13px] text-white/62">No calls match the current search.</div> : null}</div></Card>
  </AgentScreenShell>;
}
const buttonClass = "inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[.03] px-3 text-[10px] font-semibold uppercase tracking-[.1em] text-white/74 hover:bg-white/[.06]";
