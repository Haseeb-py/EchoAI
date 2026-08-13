"use client";

import { useCallback, useEffect, useState } from "react";
import { Radio, RefreshCw, Siren } from "lucide-react";
import { SupervisorScreenShell } from "@/components/supervisor/SupervisorScreenShell";
import { Badge, Card } from "@/components/ui/ui-components";
import { apiGet } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";
import { useSupervisorRefreshSeconds } from "@/components/supervisor/useSupervisorRefreshSeconds";

type LiveCall = {
  id: string;
  campaign_name: string;
  lead_name: string;
  started_at: string;
  current_node_id: string | null;
  latest_turn: { speaker: string; transcript: string; occurred_at: string } | null;
  escalation: { id: string; reason: string; severity: string; status: string; takeover_requested: boolean } | null;
};

function duration(startedAt: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function PersistedLiveCallsPage() {
  const [calls, setCalls] = useState<LiveCall[]>([]);
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState("Loading active call state from the backend.");
  const refreshSeconds = useSupervisorRefreshSeconds();

  const loadCalls = useCallback(async () => {
    try {
      const data = await apiGet<LiveCall[]>("/api/calls?status_filter=active", getStoredAuthToken());
      setCalls(data);
      setMessage(data.length ? "Live call monitor is synced with the operational API." : "No active calls are currently running.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load live calls.");
    }
  }, []);

  useEffect(() => {
    void loadCalls();
    const refreshTimer = window.setInterval(() => void loadCalls(), refreshSeconds * 1000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearInterval(refreshTimer); window.clearInterval(clockTimer); };
  }, [loadCalls, refreshSeconds]);

  return (
    <SupervisorScreenShell activeKey="activity" contextLabel="Live Calls" eyebrow="Supervisor / Live Call Monitor" title="Live Call Monitor" description="Backend-synced call state from the 3A voice pipeline and Track 3B conversation engine. Refreshes every five seconds.">
      <p className="mb-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>
      <div className="mb-4 flex items-center justify-between"><div className="text-[12px] text-white/50">{calls.length} active call{calls.length === 1 ? "" : "s"}</div><button type="button" onClick={() => void loadCalls()} className={refreshButton}><RefreshCw size={14} /> Refresh now</button></div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{calls.map((call) => <Card key={call.id} className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fdde0]"><Radio size={13} /> Live</div><h2 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-white">{call.lead_name}</h2><div className="mt-1 text-[13px] text-white/50">{call.campaign_name}</div></div><div className="text-right"><div className="font-headline text-[30px] font-semibold text-[#b9b7ff]">{duration(call.started_at)}</div><div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/38">Duration</div></div></div><div className="mt-4 grid grid-cols-2 gap-2 text-[12px] text-white/62"><div className={mini}>Current node: <span className="text-white">{call.current_node_id || "Awaiting script"}</span></div><div className={mini}>Last speaker: <span className="text-white">{call.latest_turn?.speaker || "Awaiting turn"}</span></div></div><div className="mt-3 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3 text-[13px] leading-6 text-white/68">{call.latest_turn?.transcript || "The voice pipeline has not submitted a final transcript turn yet."}</div>{call.escalation ? <div className="mt-3 rounded-[12px] border border-[#f6c56f]/22 bg-[#2a2317] p-3 text-[12px] text-[#f8dc9b]"><div className="flex items-center gap-2 font-semibold"><Siren size={14} /> {call.escalation.severity.toUpperCase()} escalation</div><div className="mt-1">{call.escalation.reason}</div><div className="mt-2">{call.escalation.takeover_requested ? "Takeover requested" : `Status: ${call.escalation.status}`}</div></div> : <Badge color="success" className="mt-3">No active escalation</Badge>}</Card>)}{!calls.length ? <div className={empty}>No active backend calls are available. Calls appear here after 3A creates them with `POST /api/calls`.</div> : null}</div>
      <span className="hidden">{now}</span>
    </SupervisorScreenShell>
  );
}

const mini = "rounded-[11px] border border-white/[0.06] bg-white/[0.02] px-3 py-2";
const refreshButton = "inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const empty = "rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62";
