"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart2,
  CheckCircle2,
  Clock3,
  Megaphone,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { AdminHeader, AdminSidebar } from "@/components/admin/AdminNavigation";
import { Badge, Card, ProgressBar } from "@/components/ui/ui-components";
import { apiGet } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

type Campaign = { id: string; name: string; product: string; audience: string; goal: string; status: string; script_id: string | null; persona_id: string | null };
type User = { id: string; role: string; status: string };

const adminTasks = [
  { label: "Create campaign container", status: "Next", icon: <Megaphone size={15} strokeWidth={2.1} aria-hidden="true" /> },
  { label: "Configure scripts and persona", status: "Ready", icon: <SlidersHorizontal size={15} strokeWidth={2.1} aria-hidden="true" /> },
  { label: "Invite agents and supervisors", status: "Planned", icon: <Users size={15} strokeWidth={2.1} aria-hidden="true" /> },
  { label: "Activate campaign after review", status: "Locked", icon: <Radio size={15} strokeWidth={2.1} aria-hidden="true" /> },
];

export default function AdminOverview() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState("Loading persisted workspace data.");
  const load = useCallback(async () => {
    try {
      const token = getStoredAuthToken();
      const [nextCampaigns, nextUsers] = await Promise.all([
        apiGet<Campaign[]>("/api/admin/campaigns", token),
        apiGet<User[]>("/api/admin/users", token),
      ]);
      setCampaigns(nextCampaigns);
      setUsers(nextUsers);
      setMessage("Campaign and user totals are synced with the backend.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load the admin overview.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const overviewStats = useMemo(() => {
    const readiness = campaigns.length ? Math.round(campaigns.reduce((sum, campaign) => sum + campaignReadiness(campaign), 0) / campaigns.length) : 0;
    return [
      { label: "Total Campaigns", value: String(campaigns.length).padStart(2, "0"), accent: "text-[#b9b7ff]" },
      { label: "Draft Campaigns", value: String(campaigns.filter((campaign) => campaign.status === "draft").length).padStart(2, "0"), accent: "text-[#f6c56f]" },
      { label: "Active Agents", value: String(users.filter((user) => user.role === "agent" && user.status === "active").length).padStart(2, "0"), accent: "text-[#8fdde0]" },
      { label: "Setup Readiness", value: `${readiness}%`, accent: "text-[#f3a8ff]" },
    ];
  }, [campaigns, users]);
  const recentCampaigns = campaigns.slice(0, 3);
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080A13] text-white">
      <div className="flex min-h-screen bg-[radial-gradient(circle_at_24%_12%,rgba(118,107,255,0.14),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(242,167,250,0.08),transparent_30%),#0D0F1A]">
        <AdminSidebar activeKey="overview" />

        <main className="flex-1">
          <AdminHeader contextLabel="Overview" primaryActionLabel="Open Campaigns" primaryActionHref="/admin/campaigns" />

          <section className="px-5 pb-8 pt-5 md:px-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
                  Admin Home / Campaign Control
                </div>
                <h1 className="mt-2 max-w-[780px] font-headline text-[50px] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
                  Admin Overview
                </h1>
                <p className="mt-4 max-w-[720px] text-[14px] leading-7 text-white/56">
                  Start here to create campaigns, check configuration progress, and jump into script and persona setup.
                </p>
              </div>

              <Link
                href="/admin/campaigns"
                className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#b9b7ff] px-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#20264b] transition-colors hover:bg-[#c8c6ff]"
              >
                <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
                Create Campaign
              </Link>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">
              <span>{message}</span>
              <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b9b7ff] hover:text-white"><RefreshCw size={13} /> Refresh</button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {overviewStats.map((stat) => (
                <Card key={stat.label} className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">{stat.label}</div>
                  <div className={`mt-3 font-headline text-[42px] font-semibold leading-none tracking-[-0.04em] ${stat.accent}`}>
                    {stat.value}
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Campaign Pipeline</div>
                    <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Recent Campaigns</h2>
                  </div>
                  <Link href="/admin/campaigns" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b9b7ff] hover:text-white">
                    View All
                  </Link>
                </div>

                <div className="space-y-3">
                  {recentCampaigns.map((campaign) => (
                    <div key={campaign.id} className="rounded-[15px] border border-white/[0.06] bg-white/[0.025] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-[17px] font-semibold text-white">{campaign.name}</div>
                          <div className="mt-1 text-[12px] text-white/42">Persona: {campaign.persona_id ? "Assigned" : "Not assigned"}</div>
                        </div>
                        <Badge color={campaign.status === "active" ? "success" : "tertiary"} className="!uppercase !tracking-[0.1em]">
                          {campaign.status}
                        </Badge>
                      </div>
                      <ProgressBar value={campaignReadiness(campaign)} color={campaignReadiness(campaign) > 80 ? "primary" : "tertiary"} label="Setup progress" showValue className="mt-4" />
                    </div>
                  ))}{!recentCampaigns.length ? <div className="rounded-[15px] border border-white/[0.06] bg-white/[0.025] p-4 text-[13px] text-white/56">No campaigns have been created yet.</div> : null}
                </div>
              </Card>

              <Card className="!rounded-[18px] !border-[#8f92ff]/16 !bg-[radial-gradient(circle_at_78%_20%,rgba(185,183,255,0.16),transparent_44%),#111420] !p-5">
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-[12px] border border-white/10 bg-white/[0.04] text-[#c9ccff]">
                    <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
                  </span>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Recommended Flow</div>
                    <h2 className="mt-1 font-headline text-[26px] font-semibold tracking-[-0.03em] text-white">Admin setup path</h2>
                  </div>
                </div>

                <div className="space-y-3">
                  {adminTasks.map((task) => (
                    <div key={task.label} className="flex items-center gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[#b9b7ff]/12 text-[#d9dcff]">{task.icon}</span>
                      <span className="min-w-0 flex-1 text-[13px] text-white/78">{task.label}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/38">{task.status}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/admin/campaigns"
                  className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] text-[12px] font-semibold uppercase tracking-[0.12em] text-white/82 hover:bg-white/[0.06]"
                >
                  <Clock3 size={14} strokeWidth={2.1} aria-hidden="true" />
                  Continue Setup
                </Link>
              </Card>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-5">
                <CheckCircle2 size={17} strokeWidth={2.1} className="text-[#a7f3c4]" aria-hidden="true" />
                <h3 className="mt-4 font-headline text-[24px] font-semibold tracking-[-0.03em] text-white">Workspace Ready</h3>
                <p className="mt-2 text-[13px] leading-6 text-white/50">{users.filter((user) => user.status === "active").length} active workspace accounts are available for campaign operations.</p>
              </Card>
              <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-5">
                <Megaphone size={17} strokeWidth={2.1} className="text-[#f6c56f]" aria-hidden="true" />
                <h3 className="mt-4 font-headline text-[24px] font-semibold tracking-[-0.03em] text-white">Create First</h3>
                <p className="mt-2 text-[13px] leading-6 text-white/50">Campaigns are containers. Script and persona setup attaches to a draft campaign.</p>
              </Card>
              <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-5">
                <BarChart2 size={17} strokeWidth={2.1} className="text-[#f3a8ff]" aria-hidden="true" />
                <h3 className="mt-4 font-headline text-[24px] font-semibold tracking-[-0.03em] text-white">Global View</h3>
                <p className="mt-2 text-[13px] leading-6 text-white/50">Analytics, CRM, and retained call reports are available from the admin navigation.</p>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function campaignReadiness(campaign: Campaign) {
  const checks = [campaign.product, campaign.audience, campaign.goal, campaign.script_id, campaign.persona_id];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
