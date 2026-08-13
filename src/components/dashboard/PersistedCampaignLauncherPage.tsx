"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw, UserRound } from "lucide-react";
import { AgentScreenShell } from "@/components/dashboard/AgentScreenShell";
import { Badge, Card } from "@/components/ui/ui-components";
import { apiGet } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

type Campaign = { id: string; name: string; product: string; audience: string; goal: string; status: string; script: { id: string; title: string; summary: string; is_active: boolean } | null; persona: { name: string; tone: string; description: string } | null };
type Lead = { id: string; name: string; contact: string; score: number; status: string; campaign_id: string; campaign_name: string; latest_call: { completed_at: string | null } | null };

export default function PersistedCampaignLauncherPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [message, setMessage] = useState("Loading active campaigns and persisted lead pools.");

  const load = async () => { try { const token = getStoredAuthToken(); const [nextCampaigns, nextLeads] = await Promise.all([apiGet<Campaign[]>("/api/agent/campaigns", token), apiGet<Lead[]>("/api/agent/leads", token)]); setCampaigns(nextCampaigns); setLeads(nextLeads); setCampaignId((current) => current || nextCampaigns[0]?.id || ""); setMessage(nextCampaigns.length ? "Choose an active campaign and a persisted lead to begin a real temporary call." : "No active campaigns are available. An admin must activate one first."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load launcher data."); } };
  useEffect(() => { void load(); }, []);
  const selectedCampaign = campaigns.find((campaign) => campaign.id === campaignId) || null;
  const campaignLeads = useMemo(() => leads.filter((lead) => lead.campaign_id === campaignId), [campaignId, leads]);
  const selectedLead = campaignLeads.find((lead) => lead.id === leadId) || null;
  useEffect(() => { setLeadId((current) => campaignLeads.some((lead) => lead.id === current) ? current : campaignLeads[0]?.id || ""); }, [campaignLeads]);
  const launch = () => { if (!selectedCampaign || !selectedLead) return; router.push(`/dashboard/live?campaignId=${encodeURIComponent(selectedCampaign.id)}&leadId=${encodeURIComponent(selectedLead.id)}`); };

  return <AgentScreenShell activeKey="campaigns" contextLabel="Campaign Launcher" eyebrow="Agent / Campaigns" title="Campaign Launcher" description="Start a real temporary voice call against an active campaign and its persisted CRM lead pool.">
    <div className="mb-4 flex justify-end"><button type="button" onClick={() => void load()} className={buttonClass}><RefreshCw size={14} /> Refresh</button></div><p className="rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.9fr]"><Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5"><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Step 1</div><h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Select active campaign</h2><div className="mt-4 space-y-3">{campaigns.map((campaign) => <button key={campaign.id} type="button" onClick={() => setCampaignId(campaign.id)} className={["w-full rounded-[14px] border p-4 text-left", campaign.id === campaignId ? "border-[#b9b7ff]/24 bg-[#b9b7ff]/8" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]"].join(" ")}><div className="flex flex-wrap justify-between gap-3"><div><div className="text-[17px] font-semibold text-white">{campaign.name}</div><div className="mt-1 text-[12px] text-white/50">{campaign.product} / {campaign.audience}</div></div><Badge color="success">ACTIVE</Badge></div><div className="mt-3 text-[12px] leading-5 text-white/60">{campaign.script?.title || "No script attached"}{campaign.persona ? ` / ${campaign.persona.name}` : ""}</div></button>)}{!campaigns.length ? <div className={empty}>No active campaigns found.</div> : null}</div></Card>
      <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5"><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Step 2</div><h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Choose lead and start</h2>{selectedCampaign ? <><div className="mt-4 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3 text-[12px] text-white/62"><div className="font-semibold text-white">{selectedCampaign.script?.title || "Script missing"}</div><div className="mt-1">{selectedCampaign.script?.summary || "Attach an active node-based script before production use."}</div></div><div className="mt-4 space-y-2">{campaignLeads.map((lead) => <button key={lead.id} type="button" onClick={() => setLeadId(lead.id)} className={["w-full rounded-[12px] border p-3 text-left", lead.id === leadId ? "border-[#8fdde0]/24 bg-[#8fdde0]/[0.08]" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"].join(" ")}><div className="flex justify-between gap-2"><div><div className="text-[14px] font-semibold text-white">{lead.name}</div><div className="mt-1 text-[11px] text-white/48">{lead.contact || "No contact"}</div></div><Badge color="primary">Score {lead.score}</Badge></div></button>)}{!campaignLeads.length ? <div className={empty}>No persisted leads are assigned to this campaign yet.</div> : null}</div><button type="button" disabled={!selectedLead || !selectedCampaign.script?.is_active} onClick={launch} className={launchButton}><UserRound size={15} /> Start call with {selectedLead?.name || "selected lead"}<ArrowRight size={15} /></button></> : <div className={`${empty} mt-4`}>Select an active campaign to view its lead pool.</div>}</Card></div>
  </AgentScreenShell>;
}

const buttonClass = "inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const launchButton = "mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-[#b9b7ff] px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#20264b] hover:bg-[#c8c6ff] disabled:cursor-not-allowed disabled:opacity-40";
const empty = "rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62";
