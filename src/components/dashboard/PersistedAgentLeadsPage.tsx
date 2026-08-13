"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, RefreshCw } from "lucide-react";
import { AgentScreenShell } from "@/components/dashboard/AgentScreenShell";
import { Badge, Card, SearchInput } from "@/components/ui/ui-components";
import { apiGet, apiPut } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

type Lead = { id: string; name: string; contact: string; score: number; status: string; campaign_name: string; summary: string; latest_call: { outcome: string | null; summary: string; analysis: Record<string, unknown>; follow_up_recommendation: string; completed_at: string | null } | null };

function badgeColor(status: string) { return status === "converted" ? "success" : status === "follow_up" || status === "qualified" ? "primary" : "neutral"; }

export default function PersistedAgentLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("Loading persisted CRM leads.");
  const [saving, setSaving] = useState(false);

  const load = async () => { try { const data = await apiGet<Lead[]>("/api/agent/leads", getStoredAuthToken()); setLeads(data); setSelectedId((current) => current || data[0]?.id || null); setMessage(data.length ? "Lead records are synced with completed-call outputs." : "No persisted leads are available yet."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load CRM leads."); } };
  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => { const text = query.trim().toLowerCase(); return leads.filter((lead) => !text || [lead.name, lead.contact, lead.status, lead.campaign_name, lead.summary].some((value) => value.toLowerCase().includes(text))); }, [leads, query]);
  const selected = filtered.find((lead) => lead.id === selectedId) || filtered[0] || null;

  const update = async (updates: { status?: string; score?: number }) => { if (!selected) return; try { setSaving(true); const result = await apiPut<{ id: string; status: string; score: number }>(`/api/agent/leads/${selected.id}`, updates, getStoredAuthToken()); setLeads((current) => current.map((lead) => lead.id === result.id ? { ...lead, status: result.status, score: result.score } : lead)); setMessage(`${selected.name} updated in the persisted CRM.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update lead."); } finally { setSaving(false); } };

  return <AgentScreenShell activeKey="leads" contextLabel="Leads & CRM" eyebrow="Agent / CRM" title="Leads & CRM" description="Maintain persisted lead disposition and score while reviewing the latest completed-call intelligence.">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="w-full max-w-[360px]"><SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search persisted leads..." /></div><button type="button" onClick={() => void load()} className={buttonClass}><RefreshCw size={14} /> Refresh</button></div><p className="mb-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_390px]"><Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Lead directory</h2><Badge color="neutral">{filtered.length} leads</Badge></div><div className="space-y-3">{filtered.map((lead) => <button key={lead.id} type="button" onClick={() => setSelectedId(lead.id)} className={["w-full rounded-[14px] border p-3 text-left", selected?.id === lead.id ? "border-[#b9b7ff]/24 bg-[#b9b7ff]/8" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]"].join(" ")}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[16px] font-semibold text-white">{lead.name}</div><div className="mt-1 text-[12px] text-white/48">{lead.contact} / {lead.campaign_name}</div></div><div className="flex gap-2"><Badge color={badgeColor(lead.status)}>{lead.status.toUpperCase()}</Badge><Badge color="primary">{lead.score}</Badge></div></div></button>)}{!filtered.length ? <div className={empty}>No leads match the search.</div> : null}</div></Card>
      <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">{selected ? <><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">Lead detail</div><h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-white">{selected.name}</h2><div className="mt-1 text-[13px] text-white/50">{selected.campaign_name} / {selected.contact}</div><div className="mt-4 flex flex-wrap gap-2">{["new", "qualified", "follow_up", "converted"].map((status) => <button key={status} type="button" disabled={saving} onClick={() => void update({ status })} className={selected.status === status ? activeChip : chip}>{status.replace("_", " ")}</button>)}</div><div className="mt-4 flex items-center justify-between rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">Lead score</div><div className="mt-1 text-[24px] font-semibold text-white">{selected.score}</div></div><div className="flex gap-2"><button type="button" disabled={saving || selected.score <= 0} onClick={() => void update({ score: selected.score - 5 })} className={scoreBtn}><Minus size={14} /></button><button type="button" disabled={saving || selected.score >= 100} onClick={() => void update({ score: selected.score + 5 })} className={scoreBtn}><Plus size={14} /></button></div></div><div className="mt-4 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] leading-6 text-white/65">{selected.latest_call?.summary || selected.summary || "No completed-call summary is attached yet."}</div><div className="mt-4 rounded-[12px] border border-[#8fdde0]/16 bg-[#8fdde0]/[0.06] p-3 text-[12px] leading-6 text-[#e1fbfd]"><div className="font-semibold uppercase tracking-[0.12em]">Follow-up recommendation</div><div className="mt-1">{selected.latest_call?.follow_up_recommendation || "No follow-up recommendation recorded."}</div></div></> : <div className={empty}>Select a lead to inspect its persisted CRM record.</div>}</Card></div>
  </AgentScreenShell>;
}

const buttonClass = "inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const chip = "rounded-[9px] border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/66 hover:bg-white/[0.06] disabled:opacity-40";
const activeChip = "rounded-[9px] border border-[#b9b7ff]/30 bg-[#b9b7ff]/12 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#dddfff] disabled:opacity-40";
const scoreBtn = "grid h-9 w-9 place-items-center rounded-[9px] border border-white/12 bg-white/[0.03] text-white/74 hover:bg-white/[0.06] disabled:opacity-40";
const empty = "rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62";
