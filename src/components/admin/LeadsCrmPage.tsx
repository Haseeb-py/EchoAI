"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Database, Flame, MoreHorizontal, Search, Star, UserCheck } from "lucide-react";
import {
  AdminMessage,
  AdminPanel,
  AdminScreenShell,
  AdminSelectField,
  AdminStatCard,
  SectionTitle,
} from "@/components/admin/AdminScreenShell";
import { Badge } from "@/components/ui/ui-components";

type LeadStatus = "Hot" | "Warm" | "Cold";
type LeadOwner = "Ayesha Khan" | "Mariam Shah" | "Hamza Malik";

type LeadRecord = {
  id: number;
  name: string;
  contact: string;
  status: LeadStatus;
  score: number;
  owner: LeadOwner;
  campaign: string;
  lastActivity: string;
  followUp: string;
  summary: string;
};

const statusOptions = ["All Statuses", "Hot", "Warm", "Cold"] as const;
const ownerOptions = ["All Owners", "Ayesha Khan", "Mariam Shah", "Hamza Malik"] as const;
const sortOptions = ["Score High-Low", "Score Low-High", "Latest Activity"] as const;

const initialLeads: LeadRecord[] = [
  {
    id: 1,
    name: "Northstar BPO",
    contact: "+1 555 0181",
    status: "Hot",
    score: 91,
    owner: "Ayesha Khan",
    campaign: "Q2 BPO Modernization Sprint",
    lastActivity: "Today, 11:10 AM",
    followUp: "Tomorrow, 10:00 AM",
    summary: "Interested in 90-day pilot; asked for pricing validation and a short implementation timeline.",
  },
  {
    id: 2,
    name: "TeleNova Support",
    contact: "+1 555 0144",
    status: "Warm",
    score: 68,
    owner: "Mariam Shah",
    campaign: "Telecom Renewal Pilot",
    lastActivity: "Today, 09:40 AM",
    followUp: "Friday, 03:30 PM",
    summary: "Needs supervisor approval before next call; customer wants reassurance about escalation controls.",
  },
  {
    id: 3,
    name: "BrightDesk CX",
    contact: "+1 555 0129",
    status: "Cold",
    score: 34,
    owner: "Ayesha Khan",
    campaign: "Q3 Support Automation Pilot",
    lastActivity: "Yesterday, 05:20 PM",
    followUp: "Next quarter",
    summary: "Low urgency; requested email follow-up next quarter after reviewing current contract cycle.",
  },
  {
    id: 4,
    name: "ScaleOps Hub",
    contact: "+1 555 0177",
    status: "Hot",
    score: 86,
    owner: "Hamza Malik",
    campaign: "SaaS Expansion Calls",
    lastActivity: "Today, 08:55 AM",
    followUp: "Today, 04:00 PM",
    summary: "High-volume support pain; wants automation demo and a side-by-side comparison with current staffing model.",
  },
];

export default function LeadsCrmPage() {
  const [leads, setLeads] = useState<LeadRecord[]>(initialLeads);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("All Statuses");
  const [ownerFilter, setOwnerFilter] = useState<(typeof ownerOptions)[number]>("All Owners");
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]>("Score High-Low");
  const [selectedLeadId, setSelectedLeadId] = useState<number>(initialLeads[0].id);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [message, setMessage] = useState("Leads & CRM is interactive in the current frontend session. Filters, selection, and lead actions update instantly.");

  const filteredLeads = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    let results = leads.filter((lead) => {
      const matchesQuery =
        !searchText ||
        [lead.name, lead.contact, lead.status, lead.owner, lead.summary, lead.campaign, lead.followUp]
          .some((value) => value.toLowerCase().includes(searchText));
      const matchesStatus = statusFilter === "All Statuses" || lead.status === statusFilter;
      const matchesOwner = ownerFilter === "All Owners" || lead.owner === ownerFilter;
      return matchesQuery && matchesStatus && matchesOwner;
    });

    if (sortBy === "Score High-Low") {
      results = [...results].sort((a, b) => b.score - a.score);
    } else if (sortBy === "Score Low-High") {
      results = [...results].sort((a, b) => a.score - b.score);
    } else {
      results = [...results].sort((a, b) => b.id - a.id);
    }

    return results;
  }, [leads, ownerFilter, query, sortBy, statusFilter]);

  const hotLeads = leads.filter((lead) => lead.status === "Hot").length;
  const averageScore = Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length);
  const uniqueOwners = new Set(leads.map((lead) => lead.owner)).size;

  const updateLead = (id: number, updates: Partial<LeadRecord>, nextMessage: string) => {
    setLeads((currentLeads) => currentLeads.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead)));
    setOpenMenuId(null);
    setMessage(nextMessage);
  };

  const cycleOwner = (currentOwner: LeadOwner): LeadOwner => {
    if (currentOwner === "Ayesha Khan") return "Mariam Shah";
    if (currentOwner === "Mariam Shah") return "Hamza Malik";
    return "Ayesha Khan";
  };

  return (
    <AdminScreenShell
      activeKey="leads"
      contextLabel="Leads CRM"
      eyebrow="Admin CRM / Lead Audit"
      title="Leads & CRM"
      description="Audit all leads, AI summaries, lead scores, statuses, owners, and follow-up context across every campaign."
    >
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_220px_220px]">
        <AdminPanel className="!p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">CRM Filters</div>
              <div className="mt-1 text-[14px] font-semibold text-white">Filter leads by owner, status, score, or activity</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatusFilter("All Statuses");
                setOwnerFilter("All Owners");
                setSortBy("Score High-Low");
                setSelectedLeadId(initialLeads[0].id);
                setMessage("CRM filters reset to the default frontend view.");
              }}
              className="inline-flex h-10 items-center rounded-[10px] border border-white/10 bg-white/[0.03] px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:bg-white/[0.06]"
            >
              Reset View
            </button>
          </div>
        </AdminPanel>
        <AdminSelectField label="Status Filter" value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
        <AdminSelectField label="Owner Filter" value={ownerFilter} options={ownerOptions} onChange={setOwnerFilter} />
        <AdminSelectField label="Sort By" value={sortBy} options={sortOptions} onChange={setSortBy} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={() => setStatusFilter("All Statuses")} className="text-left">
          <AdminStatCard label="Total Leads" value={leads.length.toLocaleString()} accent="text-[#b9b7ff]" icon={<Database size={17} strokeWidth={2.1} aria-hidden="true" />} />
        </button>
        <button type="button" onClick={() => setStatusFilter("Hot")} className="text-left">
          <AdminStatCard label="Hot Leads" value={String(hotLeads).padStart(2, "0")} accent="text-[#f6c56f]" icon={<Flame size={17} strokeWidth={2.1} aria-hidden="true" />} />
        </button>
        <button type="button" onClick={() => setSortBy("Score High-Low")} className="text-left">
          <AdminStatCard label="Avg Score" value={String(averageScore)} accent="text-[#a7f3c4]" icon={<Star size={17} strokeWidth={2.1} aria-hidden="true" />} />
        </button>
        <button type="button" onClick={() => setOwnerFilter("All Owners")} className="text-left">
          <AdminStatCard label="Owners" value={String(uniqueOwners).padStart(2, "0")} accent="text-[#8fdde0]" icon={<UserCheck size={17} strokeWidth={2.1} aria-hidden="true" />} />
        </button>
      </div>

      <AdminMessage>
        {`${message} Showing ${filteredLeads.length} filtered leads. Status filter: ${statusFilter}. Owner filter: ${ownerFilter}. Sort: ${sortBy}.`}
      </AdminMessage>

      <AdminPanel className="mt-4">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SectionTitle eyebrow="Lead Directory" title="All lead records" />
          <label className="relative w-full max-w-[340px]">
            <Search size={15} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search leads..."
              className="w-full rounded-[10px] border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-4 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-[#b9b7ff]/36"
            />
          </label>
        </div>

        <div className="space-y-3">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className={[
                "rounded-[16px] border p-4 transition-colors",
                selectedLeadId === lead.id ? "border-[#b9b7ff]/24 bg-[#b9b7ff]/8" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLeadId(lead.id);
                    setMessage(`${lead.name} selected. Score ${lead.score} and status ${lead.status}.`);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-headline text-[24px] font-semibold tracking-[-0.03em] text-white">{lead.name}</div>
                    <Badge color={lead.status === "Hot" ? "tertiary" : lead.status === "Warm" ? "primary" : "neutral"}>{lead.status}</Badge>
                    <Badge color="success">Score {lead.score}</Badge>
                  </div>
                  <div className="mt-1 text-[12px] text-white/44">
                    {lead.contact} / Owner: {lead.owner} / Campaign: {lead.campaign}
                  </div>
                  <p className="mt-3 text-[13px] leading-6 text-white/58">{lead.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-white/42">
                    <span>Last activity: {lead.lastActivity}</span>
                    <span>Follow-up: {lead.followUp}</span>
                  </div>
                </button>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateLead(lead.id, { status: "Hot" }, `${lead.name} marked as Hot.`)}
                    className="inline-flex h-9 items-center rounded-[10px] border border-white/10 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/68 hover:bg-white/[0.06]"
                  >
                    Mark Hot
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLead(lead.id, { followUp: "Tomorrow, 11:30 AM" }, `Follow-up updated for ${lead.name}.`)}
                    className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/68 hover:bg-white/[0.06]"
                  >
                    <CalendarClock size={13} strokeWidth={2.1} aria-hidden="true" />
                    Follow-up
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId((current) => (current === lead.id ? null : lead.id))}
                      className="grid h-9 w-9 place-items-center rounded-[10px] border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                      aria-label={`More actions for ${lead.name}`}
                      aria-expanded={openMenuId === lead.id}
                    >
                      <MoreHorizontal size={15} strokeWidth={2.1} aria-hidden="true" />
                    </button>

                    {openMenuId === lead.id ? (
                      <div className="absolute right-0 top-11 z-40 w-[220px] rounded-[14px] border border-white/10 bg-[#171b28]/98 p-2 shadow-[0_18px_40px_rgba(6,7,14,0.45)] backdrop-blur-xl">
                        <CrmMenuAction
                          label="Set Warm"
                          onClick={() => updateLead(lead.id, { status: "Warm" }, `${lead.name} moved to Warm.`)}
                        />
                        <CrmMenuAction
                          label="Set Cold"
                          onClick={() => updateLead(lead.id, { status: "Cold" }, `${lead.name} moved to Cold.`)}
                        />
                        <CrmMenuAction
                          label="Reassign Owner"
                          onClick={() => updateLead(lead.id, { owner: cycleOwner(lead.owner) }, `${lead.name} reassigned to ${cycleOwner(lead.owner)}.`)}
                        />
                        <CrmMenuAction
                          label="Schedule Follow-up"
                          onClick={() => updateLead(lead.id, { followUp: "Friday, 02:00 PM" }, `Follow-up scheduled for ${lead.name}.`)}
                        />
                        <CrmMenuAction
                          label="Boost Score +5"
                          onClick={() => updateLead(lead.id, { score: Math.min(100, lead.score + 5) }, `${lead.name} score increased to ${Math.min(100, lead.score + 5)}.`)}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>
    </AdminScreenShell>
  );
}

function CrmMenuAction({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-white/78 hover:bg-white/[0.05] hover:text-white"
    >
      {label}
    </button>
  );
}
