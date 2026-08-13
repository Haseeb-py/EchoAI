"use client";

import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminMessage, AdminPanel, AdminScreenShell, AdminStatCard, SectionTitle } from "@/components/admin/AdminScreenShell";
import { apiDownload, apiGet } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

type CampaignMetric = { campaign_id: string; name: string; status: string; total_calls: number; completed_calls: number; escalation_count: number };

export default function PersistedReportsPage() {
  const [campaigns, setCampaigns] = useState<CampaignMetric[]>([]);
  const [message, setMessage] = useState("Loading retained report data.");
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    try {
      const result = await apiGet<CampaignMetric[]>("/api/admin/analytics/campaigns", getStoredAuthToken());
      setCampaigns(result);
      setMessage(result.length ? "The export includes active, completed, and archived campaign history." : "No persisted calls are available to export yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load retained report data.");
    }
  };

  useEffect(() => { void load(); }, []);

  const download = async () => {
    setDownloading(true);
    try {
      await apiDownload("/api/admin/reports/calls.csv", "echoai-call-history.csv", getStoredAuthToken());
      setMessage("Call history CSV downloaded from the retained backend records.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to download the call history CSV.");
    } finally {
      setDownloading(false);
    }
  };

  const calls = campaigns.reduce((sum, campaign) => sum + campaign.total_calls, 0);
  const completed = campaigns.reduce((sum, campaign) => sum + campaign.completed_calls, 0);
  const archived = campaigns.filter((campaign) => campaign.status === "archived").length;

  return <AdminScreenShell activeKey="reports" contextLabel="Reports" eyebrow="Admin Reports / Retained History" title="Reports & Exports" description="Download project-ready call history without losing completed or archived campaign records.">
    <div className="mb-4 flex justify-end"><button type="button" onClick={() => void load()} className={secondaryButton}><RefreshCw size={14} /> Refresh data</button></div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><AdminStatCard label="Retained Calls" value={String(calls)} accent="text-[#8fdde0]" icon={<FileSpreadsheet size={17} />} /><AdminStatCard label="Completed Calls" value={String(completed)} accent="text-[#a7f3c4]" icon={<Download size={17} />} /><AdminStatCard label="Archived Campaigns" value={String(archived)} accent="text-[#b9b7ff]" icon={<FileSpreadsheet size={17} />} /></div>
    <AdminMessage>{message}</AdminMessage>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <AdminPanel><SectionTitle eyebrow="Available Export" title="Retained call history CSV" /><p className="mt-3 max-w-2xl text-[13px] leading-6 text-white/62">Each row contains campaign lifecycle status, lead details, call timings, LLM summary and sentiment output, objection and toxicity findings, follow-up guidance, and escalation totals.</p><button type="button" disabled={downloading} onClick={() => void download()} className="mt-5 inline-flex h-11 items-center gap-2 rounded-[11px] bg-[#b9b7ff] px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#20264b] disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} />{downloading ? "Preparing CSV..." : "Download Call History CSV"}</button></AdminPanel>
      <AdminPanel glow><SectionTitle eyebrow="Retention Rule" title="Campaign lifecycle preserved" /><p className="mt-3 text-[13px] leading-6 text-white/62">Exports are read from persisted records, not browser state. Ending or archiving a campaign makes it read-only operational history; it never removes its calls or statistics.</p></AdminPanel>
    </div>
  </AdminScreenShell>;
}

const secondaryButton = "inline-flex h-9 items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
