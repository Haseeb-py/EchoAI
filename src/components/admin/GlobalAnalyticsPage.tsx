"use client";

import { useMemo, useState } from "react";
import { Bot, Radio, TrendingUp, Users } from "lucide-react";
import {
  AdminMessage,
  AdminPanel,
  AdminScreenShell,
  AdminSelectField,
  AdminStatCard,
  SectionTitle,
} from "@/components/admin/AdminScreenShell";
import { Badge, ProgressBar } from "@/components/ui/ui-components";

type CampaignMetric = {
  name: string;
  calls: number;
  conversion: number;
  positiveSentiment: number;
  qualified: number;
  nurture: number;
  converted: number;
  lost: number;
};

type TeamMetric = {
  name: string;
  role: "Agent" | "Supervisor";
  calls: number;
  conversion: number | null;
  positiveSentiment: number;
  escalations: number;
  status: "Strong" | "Watch" | "Support";
};

const dateRanges = ["Today", "Last 7 Days", "Last 30 Days"] as const;
const roleFilters = ["All Roles", "Agent", "Supervisor"] as const;
const statFocusOptions = ["All Metrics", "Calls", "Conversion", "Sentiment", "Coverage"] as const;

const campaignPerformance: CampaignMetric[] = [
  {
    name: "Q2 BPO Modernization Sprint",
    calls: 1240,
    conversion: 34,
    positiveSentiment: 72,
    qualified: 68,
    nurture: 44,
    converted: 34,
    lost: 12,
  },
  {
    name: "Telecom Renewal Pilot",
    calls: 680,
    conversion: 21,
    positiveSentiment: 61,
    qualified: 52,
    nurture: 33,
    converted: 21,
    lost: 19,
  },
  {
    name: "SaaS Expansion Calls",
    calls: 2050,
    conversion: 42,
    positiveSentiment: 78,
    qualified: 74,
    nurture: 55,
    converted: 42,
    lost: 9,
  },
];

const agentPerformance: TeamMetric[] = [
  { name: "Ayesha Khan", role: "Agent", calls: 420, conversion: 31, positiveSentiment: 74, escalations: 8, status: "Strong" },
  { name: "Mariam Shah", role: "Agent", calls: 305, conversion: 24, positiveSentiment: 62, escalations: 14, status: "Watch" },
  { name: "Hamza Malik", role: "Supervisor", calls: 0, conversion: null, positiveSentiment: 70, escalations: 22, status: "Strong" },
  { name: "Sana Javed", role: "Supervisor", calls: 0, conversion: null, positiveSentiment: 66, escalations: 17, status: "Support" },
];

export default function GlobalAnalyticsPage() {
  const [dateRange, setDateRange] = useState<(typeof dateRanges)[number]>("Last 7 Days");
  const [roleFilter, setRoleFilter] = useState<(typeof roleFilters)[number]>("All Roles");
  const [selectedCampaignName, setSelectedCampaignName] = useState<string>(campaignPerformance[0].name);
  const [statFocus, setStatFocus] = useState<(typeof statFocusOptions)[number]>("All Metrics");
  const [selectedTeamMemberName, setSelectedTeamMemberName] = useState<string>(agentPerformance[0].name);
  const [message, setMessage] = useState("Analytics is interactive in the frontend session. Filters and campaign focus update the dashboard immediately.");

  const selectedCampaign =
    campaignPerformance.find((campaign) => campaign.name === selectedCampaignName) || campaignPerformance[0];

  const filteredTeam = useMemo(() => {
    if (roleFilter === "All Roles") {
      return agentPerformance;
    }
    return agentPerformance.filter((person) => person.role === roleFilter);
  }, [roleFilter]);

  const topStats = useMemo(() => {
    const totalCalls = campaignPerformance.reduce((sum, campaign) => sum + campaign.calls, 0);
    const averageConversion = Math.round(campaignPerformance.reduce((sum, campaign) => sum + campaign.conversion, 0) / campaignPerformance.length);
    const averageSentiment = Math.round(campaignPerformance.reduce((sum, campaign) => sum + campaign.positiveSentiment, 0) / campaignPerformance.length);
    const activeUsers = filteredTeam.length;

    return [
      { key: "Calls", label: "Total Calls", value: totalCalls.toLocaleString(), accent: "text-[#b9b7ff]", icon: <Radio size={17} strokeWidth={2.1} aria-hidden="true" /> },
      { key: "Conversion", label: "Conversion", value: `${averageConversion}%`, accent: "text-[#a7f3c4]", icon: <TrendingUp size={17} strokeWidth={2.1} aria-hidden="true" /> },
      { key: "Sentiment", label: "Positive Sentiment", value: `${averageSentiment}%`, accent: "text-[#8fdde0]", icon: <Bot size={17} strokeWidth={2.1} aria-hidden="true" /> },
      { key: "Coverage", label: "Active Team View", value: String(activeUsers).padStart(2, "0"), accent: "text-[#f3a8ff]", icon: <Users size={17} strokeWidth={2.1} aria-hidden="true" /> },
    ];
  }, [filteredTeam]);

  const funnelStages = [
    { label: "Contacted", value: 100 },
    { label: "Qualified", value: selectedCampaign.qualified },
    { label: "Nurture", value: selectedCampaign.nurture },
    { label: "Converted", value: selectedCampaign.converted },
    { label: "Lost", value: selectedCampaign.lost },
  ];

  return (
    <AdminScreenShell
      activeKey="analytics"
      contextLabel="Analytics"
      eyebrow="Admin Analytics / Global Performance"
      title="Global Analytics"
      description="View system-wide call volume, sentiment, conversion, campaign performance, and team activity across EchoAI."
    >
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_220px_220px]">
        <AdminPanel className="!p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">Dashboard Filters</div>
              <div className="mt-1 text-[14px] font-semibold text-white">Use filters to focus the analytics view</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDateRange("Last 7 Days");
                setRoleFilter("All Roles");
                setSelectedCampaignName(campaignPerformance[0].name);
                setStatFocus("All Metrics");
                setSelectedTeamMemberName(agentPerformance[0].name);
                setMessage("Analytics filters reset to the default frontend view.");
              }}
              className="inline-flex h-10 items-center rounded-[10px] border border-white/10 bg-white/[0.03] px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:bg-white/[0.06]"
            >
              Reset View
            </button>
          </div>
        </AdminPanel>
        <AdminSelectField label="Date Range" value={dateRange} options={dateRanges} onChange={(value) => setDateRange(value)} />
        <AdminSelectField label="Role Filter" value={roleFilter} options={roleFilters} onChange={(value) => setRoleFilter(value)} />
        <AdminSelectField label="Metric Focus" value={statFocus} options={statFocusOptions} onChange={(value) => setStatFocus(value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topStats.map((stat) => (
          <button
            key={stat.key}
            type="button"
            onClick={() => {
              setStatFocus(stat.key as (typeof statFocusOptions)[number]);
              setMessage(`${stat.label} is now the primary analytics focus for this view.`);
            }}
            className="text-left"
          >
            <div className={statFocus === stat.key ? "rounded-[18px] ring-1 ring-[#b9b7ff]/36" : ""}>
              <AdminStatCard label={stat.label} value={stat.value} accent={stat.accent} icon={stat.icon} />
            </div>
          </button>
        ))}
      </div>

      <AdminMessage>
        {`${message} Showing ${dateRange} analytics for ${roleFilter}. Current campaign focus: ${selectedCampaign.name}. Metric focus: ${statFocus}.`}
      </AdminMessage>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminPanel>
          <SectionTitle eyebrow="Campaign Performance" title="Campaign conversion overview" />
          <div className="space-y-4">
            {campaignPerformance.map((campaign) => (
              <button
                key={campaign.name}
                type="button"
                onClick={() => {
                  setSelectedCampaignName(campaign.name);
                  setMessage(`${campaign.name} is now selected. Funnel and campaign context have been updated.`);
                }}
                className={[
                  "w-full rounded-[15px] border p-4 text-left transition-colors",
                  selectedCampaignName === campaign.name
                    ? "border-[#b9b7ff]/26 bg-[#b9b7ff]/10"
                    : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[17px] font-semibold text-white">{campaign.name}</div>
                    <div className="mt-1 text-[12px] text-white/42">
                      {campaign.calls.toLocaleString()} calls / {campaign.positiveSentiment}% positive sentiment
                    </div>
                  </div>
                  <Badge color={campaign.conversion > 30 ? "primary" : "tertiary"}>{campaign.conversion}% Conversion</Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <MetricMini label="Calls" value={campaign.calls.toLocaleString()} />
                  <MetricMini label="Conversion" value={`${campaign.conversion}%`} />
                  <MetricMini label="Sentiment" value={`${campaign.positiveSentiment}%`} />
                </div>
                <ProgressBar value={campaign.conversion} color={campaign.conversion > 30 ? "primary" : "tertiary"} className="mt-4" />
              </button>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel glow>
          <SectionTitle eyebrow="Funnel" title="Lead conversion funnel" />
          <div className="mb-4 rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">Selected Campaign</div>
            <div className="mt-2 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">{selectedCampaign.name}</div>
            <div className="mt-2 text-[12px] text-white/46">
              {selectedCampaign.calls.toLocaleString()} calls / {selectedCampaign.conversion}% conversion / {selectedCampaign.positiveSentiment}% positive sentiment
            </div>
          </div>
          {funnelStages.map((stage, index) => (
            <button
              key={stage.label}
              type="button"
              onClick={() => setMessage(`${stage.label} stage selected for ${selectedCampaign.name}.`)}
              className="mb-4 block w-full text-left"
            >
              <div className="mb-2 flex items-center justify-between text-[12px] text-white/60">
                <span>{stage.label}</span>
                <span>{stage.value}%</span>
              </div>
              <ProgressBar value={stage.value} color={index < 3 ? "primary" : "secondary"} />
            </button>
          ))}
        </AdminPanel>
      </div>

      <AdminPanel className="mt-4">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SectionTitle eyebrow="Team Table" title="Agent and supervisor performance" />
        </div>

        <div className="overflow-hidden rounded-[16px] border border-white/[0.06]">
          <div className="hidden grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 bg-white/[0.04] px-4 py-3 md:grid">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">Name</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">Role</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">Calls</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">Conversion</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">Sentiment</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">Escalations</div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {filteredTeam.map((agent) => (
              <button
                key={agent.name}
                type="button"
                onClick={() => {
                  setSelectedTeamMemberName(agent.name);
                  setMessage(`${agent.name} selected. ${agent.role} status: ${agent.status}. ${agent.escalations} escalations in the current view.`);
                }}
                className={[
                  "grid w-full gap-3 px-4 py-4 text-left transition-colors md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr]",
                  selectedTeamMemberName === agent.name ? "bg-[#b9b7ff]/8" : "bg-white/[0.02] hover:bg-white/[0.05]",
                ].join(" ")}
              >
                <div>
                  <div className="font-semibold text-white">{agent.name}</div>
                  <div className="mt-1 text-[12px] text-white/42 md:hidden">{agent.role} / {agent.escalations} escalations</div>
                </div>
                <div className="hidden md:block">
                  <Badge color={agent.role === "Supervisor" ? "secondary" : "primary"}>{agent.role}</Badge>
                </div>
                <div className="text-white/64">{agent.calls > 0 ? `${agent.calls}` : "Team view"}</div>
                <div className="text-white/64">{agent.conversion !== null ? `${agent.conversion}%` : "Team view"}</div>
                <div className="text-white/64">{agent.positiveSentiment}% positive</div>
                <div className="flex items-center justify-between gap-3 md:flex md:flex-col md:items-start md:justify-center">
                  <span className="text-white/64">{agent.escalations}</span>
                  <div className="md:mt-2">
                    <Badge color={agent.status === "Strong" ? "success" : agent.status === "Watch" ? "tertiary" : "neutral"}>
                      {agent.status}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </AdminPanel>
    </AdminScreenShell>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-white/[0.06] bg-[#111420]/70 p-3">
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/36">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-white/78">{value}</div>
    </div>
  );
}
