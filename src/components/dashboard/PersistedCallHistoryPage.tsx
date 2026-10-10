"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { AgentScreenShell } from "@/components/dashboard/AgentScreenShell";
import { Badge, Card, SearchInput } from "@/components/ui/ui-components";
import { apiGet } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

type CompletedCall = {
  id: string;
  campaign_name: string;
  lead_name: string;
  agent_id: string | null;
  status: string;
  started_at: string;
  outcome: string | null;
  summary: string;
  analysis: Record<string, unknown>;
  follow_up_recommendation: string;
  completed_at: string | null;
};

function sentiment(value: unknown) {
  return value === "positive" || value === "negative" || value === "neutral" ? value : "not analyzed";
}

function sentimentColor(value: string) {
  return value === "positive" ? "success" : value === "negative" ? "danger" : value === "neutral" ? "primary" : "neutral";
}

export default function PersistedCallHistoryPage() {
  const [calls, setCalls] = useState<CompletedCall[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Loading completed calls from the backend.");

  const loadCalls = async () => {
    try {
      const data = await apiGet<CompletedCall[]>("/api/calls?status_filter=terminal", getStoredAuthToken());
      setCalls(data);
      setSelectedId((current) => current || data[0]?.id || null);
      setMessage(data.length ? "Terminal call history is synced with persisted analysis." : "No completed or disconnected calls are available yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load completed calls.");
    }
  };

  useEffect(() => { void loadCalls(); }, []);
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return calls.filter((call) => !text || [call.lead_name, call.campaign_name, call.outcome || "", call.summary].some((value) => value.toLowerCase().includes(text)));
  }, [calls, query]);
  const selected = filtered.find((call) => call.id === selectedId) || filtered[0] || null;
  const objections = Array.isArray(selected?.analysis.objections) ? selected?.analysis.objections as string[] : [];
  const toxicLanguage = Array.isArray(selected?.analysis.toxic_language) ? selected?.analysis.toxic_language as Array<{ phrase?: string; speaker?: string }> : [];

  return (
    <AgentScreenShell activeKey="history" contextLabel="Call History" eyebrow="Agent / Post-call Intelligence" title="Call History" description="Review persisted summaries, prompt-engineered sentiment, objections, toxicity findings, and follow-up guidance.">
      <p className="mb-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_390px]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Persisted Records</div><h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Completed calls</h2></div><button type="button" onClick={() => void loadCalls()} className={ghostBtn}><RefreshCw size={14} /> Refresh</button></div>
          <div className="mt-4 max-w-[380px]"><SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search history..." /></div>
          <div className="mt-4 space-y-3">{filtered.map((call) => <Link key={call.id} href={`/dashboard/call/${call.id}`} onClick={() => setSelectedId(call.id)} className={["block w-full rounded-[14px] border p-3 text-left", selected?.id === call.id ? "border-[#b9b7ff]/24 bg-[#b9b7ff]/8" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]"].join(" ")}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[16px] font-semibold text-white">{call.lead_name}</div><div className="mt-1 text-[12px] text-white/48">{call.campaign_name}</div></div><Badge color="primary">{call.status.toUpperCase()}</Badge></div><div className="mt-3 flex items-center justify-between gap-2 text-[12px] text-white/56"><span>{call.completed_at ? new Date(call.completed_at).toLocaleString() : "End time unavailable"}</span><span className="text-[#8fdde0]">Open full transcript →</span></div></Link>)}{!filtered.length ? <div className={empty}>No calls match the current search.</div> : null}</div>
        </Card>
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          {selected ? <><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Post-call Analysis</div><h2 className="mt-2 text-[25px] font-semibold tracking-[-0.03em] text-white">{selected.lead_name}</h2><div className="mt-1 text-[13px] text-white/50">{selected.campaign_name}</div>
            <div className="mt-4 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] leading-6 text-white/68">{selected.summary || "No summary has been supplied by the call analysis yet."}</div>
            <div className="mt-4 grid grid-cols-3 gap-2">{(["start_sentiment", "end_sentiment", "overall_sentiment"] as const).map((key) => { const value = sentiment(selected.analysis[key]); return <div key={key} className="rounded-[11px] border border-white/[0.06] bg-white/[0.02] p-2 text-center"><div className="text-[9px] uppercase tracking-[0.12em] text-white/38">{key.replace("_sentiment", "")}</div><Badge color={sentimentColor(value)} className="mt-2">{value}</Badge></div>; })}</div>
            <div className="mt-4"><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">Objections</div><div className="mt-2 flex flex-wrap gap-2">{objections.length ? objections.map((objection, index) => <Badge key={`${objection}-${index}`} color="tertiary">{objection}</Badge>) : <span className="text-[12px] text-white/48">No objections recorded.</span>}</div></div>
            <div className="mt-4 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3 text-[12px] text-white/62"><div className="flex items-center gap-2 font-semibold text-white/80"><ShieldAlert size={14} /> Toxic language review</div><div className="mt-2">{toxicLanguage.length ? toxicLanguage.map((item, index) => <div key={index}>{item.speaker || "Unknown"}: {item.phrase || "Flagged phrase"}</div>) : "No explicit toxic language found."}</div></div>
            <div className="mt-4 rounded-[12px] border border-[#8fdde0]/16 bg-[#8fdde0]/[0.06] p-3 text-[12px] leading-6 text-[#e1fbfd]"><div className="font-semibold uppercase tracking-[0.12em]">Follow-up recommendation</div><div className="mt-1">{selected.follow_up_recommendation || "No follow-up recommendation recorded."}</div></div>
          </> : <div className={empty}>Select a completed call to inspect analysis.</div>}
        </Card>
      </div>
    </AgentScreenShell>
  );
}

const ghostBtn = "inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const empty = "rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62";
