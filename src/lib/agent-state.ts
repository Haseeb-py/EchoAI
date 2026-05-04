import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";
import {
  readSupervisorLiveCalls,
  SUPERVISOR_LIVE_CALLS_CHANGE_EVENT,
  type LiveCallItem,
  type LiveCallTranscriptMessage,
  writeSupervisorLiveCalls,
} from "@/lib/supervisor-state";

type AgentCampaignStatus = "Ready" | "Running" | "Paused";
type LeadStatus = "Hot" | "Warm" | "Cold";
type CallOutcome = "Converted" | "Pending" | "Lost";

type BackendAgentCampaign = {
  id: string;
  name: string;
  product: string;
  audience: string;
  goal: string;
  status: string;
  script: {
    id: string;
    title: string;
    summary: string;
    content: string;
    is_active: boolean;
  } | null;
  persona: {
    id: string;
    name: string;
    tone: string;
    description: string;
    is_active: boolean;
  } | null;
};

export type AgentScriptItem = {
  id: string;
  campaignId: string;
  title: string;
  summary: string;
  content: string;
};

export type AgentCampaign = {
  id: string;
  name: string;
  product: string;
  audience: string;
  persona: "Friendly" | "Professional" | "Empathetic";
  personaName?: string;
  personaTone?: string;
  personaDescription?: string;
  status: AgentCampaignStatus;
  leadPool: number;
  defaultBatchSize: number;
  lastLaunchedAt: string | null;
};

export type AgentLiveCallItem = LiveCallItem & {
  leadId: string;
  leadName: string;
  scriptName: string;
};

export type AgentCallHistoryItem = {
  id: string;
  callId: string;
  leadId: string;
  leadName: string;
  campaignName: string;
  duration: number;
  sentiment: LiveCallItem["sentiment"];
  outcome: CallOutcome;
  leadScore: number;
  completedAt: string;
};

export type AgentLeadItem = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  contact: string;
  city: string;
  zipCode: string;
  campaign: string;
  campaignType: string;
  status: LeadStatus;
  score: number;
  lastInteraction: string;
  notes: string;
  callSummary: string;
  campaignFields: Record<string, string>;
};

export const AGENT_CAMPAIGNS_KEY = "echoai_agent_campaigns";
export const AGENT_HISTORY_KEY = "echoai_agent_call_history";
export const AGENT_LEADS_KEY = "echoai_agent_leads";
export const AGENT_SCRIPTS_KEY = "echoai_agent_scripts";
export const AGENT_STATE_CHANGE_EVENT = "echoai_agent_state_changed";

const DEFAULT_AGENT_NAME = "Agent Desk";
const DEFAULT_LEAD_POOL = 18;
const DEFAULT_BATCH_SIZE = 3;

const defaultCampaigns: AgentCampaign[] = [
  {
    id: "cmp-agent-01",
    name: "Q2 BPO Modernization Sprint",
    product: "EchoAI Voice Automation Suite",
    audience: "Mid-market BPO operators",
    persona: "Professional",
    status: "Ready",
    leadPool: 18,
    defaultBatchSize: 3,
    lastLaunchedAt: null,
  },
  {
    id: "cmp-agent-02",
    name: "Telecom Renewal Pilot",
    product: "Renewal retention workflow",
    audience: "Telecom account teams",
    persona: "Empathetic",
    status: "Running",
    leadPool: 12,
    defaultBatchSize: 2,
    lastLaunchedAt: "2026-04-24T12:00:00.000Z",
  },
  {
    id: "cmp-agent-03",
    name: "SaaS Expansion Calls",
    product: "Expansion qualification flow",
    audience: "Existing SaaS customers",
    persona: "Friendly",
    status: "Ready",
    leadPool: 22,
    defaultBatchSize: 4,
    lastLaunchedAt: null,
  },
];

const defaultScripts: AgentScriptItem[] = [
  { id: "script-bpo-01", campaignId: "cmp-agent-01", title: "BPO Discovery Flow", summary: "Qualification and handoff script for modernization leads.", content: "" },
  { id: "script-bpo-02", campaignId: "cmp-agent-01", title: "BPO Objection Recovery", summary: "Handles pricing and implementation concerns.", content: "" },
  { id: "script-telco-01", campaignId: "cmp-agent-02", title: "Renewal Retention Flow", summary: "Retention path for telecom renewal conversations.", content: "" },
  { id: "script-telco-02", campaignId: "cmp-agent-02", title: "Escalation Save Flow", summary: "Supervisor-safe recovery sequence for at-risk calls.", content: "" },
  { id: "script-saas-01", campaignId: "cmp-agent-03", title: "Expansion Discovery Flow", summary: "Find expansion fit and route to follow-up.", content: "" },
  { id: "script-saas-02", campaignId: "cmp-agent-03", title: "Procurement Close Flow", summary: "Use when the customer is already comparing vendors.", content: "" },
];

const defaultLeads: AgentLeadItem[] = [
  {
    id: "lead-1001",
    name: "Northstar BPO",
    firstName: "Northstar",
    lastName: "BPO",
    contact: "+1 555 0181",
    city: "Lahore",
    zipCode: "54000",
    campaign: "Q2 BPO Modernization Sprint",
    campaignType: "Vehicle Insurance",
    status: "Hot",
    score: 91,
    lastInteraction: "Today, 11:10 AM",
    notes: "Strong implementation fit; requested a shorter rollout summary.",
    callSummary: "Interested in a phased rollout and asked for implementation timing.",
    campaignFields: { "Vehicle Type": "Fleet SUV", Model: "Toyota Fortuner", Year: "2023" },
  },
  {
    id: "lead-1002",
    name: "TeleNova Support",
    firstName: "TeleNova",
    lastName: "Support",
    contact: "+1 555 0144",
    city: "Karachi",
    zipCode: "75500",
    campaign: "Telecom Renewal Pilot",
    campaignType: "Medical Insurance",
    status: "Warm",
    score: 68,
    lastInteraction: "Today, 09:40 AM",
    notes: "Needs a clean escalation path before the next follow-up.",
    callSummary: "Needs renewal reassurance and supervisor-backed follow-up.",
    campaignFields: { Age: "42", "Existing Conditions": "None disclosed", "Coverage Type": "Family" },
  },
  {
    id: "lead-1003",
    name: "BrightDesk CX",
    firstName: "BrightDesk",
    lastName: "CX",
    contact: "+1 555 0129",
    city: "Islamabad",
    zipCode: "44000",
    campaign: "SaaS Expansion Calls",
    campaignType: "SaaS Expansion",
    status: "Cold",
    score: 34,
    lastInteraction: "Yesterday, 05:20 PM",
    notes: "Prefers email follow-up after the current contract cycle.",
    callSummary: "Requested a later follow-up after reviewing current contract timing.",
    campaignFields: { Tier: "Pro", Seats: "120", "Expansion Interest": "Analytics add-on" },
  },
  {
    id: "lead-1004",
    name: "ScaleOps Hub",
    firstName: "ScaleOps",
    lastName: "Hub",
    contact: "+1 555 0177",
    city: "Peshawar",
    zipCode: "25000",
    campaign: "SaaS Expansion Calls",
    campaignType: "SaaS Expansion",
    status: "Hot",
    score: 86,
    lastInteraction: "Today, 08:55 AM",
    notes: "Strong expansion signal and request for live pricing comparison.",
    callSummary: "Expansion opportunity with pricing comparison requested for next step.",
    campaignFields: { Tier: "Enterprise", Seats: "260", "Expansion Interest": "Workflow automation" },
  },
];

const defaultHistory: AgentCallHistoryItem[] = [
  {
    id: "hist-9001",
    callId: "call-3001",
    leadId: "lead-1001",
    leadName: "Northstar BPO",
    campaignName: "Q2 BPO Modernization Sprint",
    duration: 764,
    sentiment: "positive",
    outcome: "Converted",
    leadScore: 92,
    completedAt: "Today, 10:20 AM",
  },
  {
    id: "hist-9002",
    callId: "call-3002",
    leadId: "lead-1002",
    leadName: "TeleNova Support",
    campaignName: "Telecom Renewal Pilot",
    duration: 521,
    sentiment: "neutral",
    outcome: "Pending",
    leadScore: 66,
    completedAt: "Today, 09:12 AM",
  },
];

function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function emitAgentStateChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AGENT_STATE_CHANGE_EVENT));
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function deriveLeadStatus(score: number): LeadStatus {
  if (score >= 80) {
    return "Hot";
  }

  if (score >= 55) {
    return "Warm";
  }

  return "Cold";
}

function deriveOutcome(score: number): CallOutcome {
  if (score >= 78) {
    return "Converted";
  }

  if (score >= 52) {
    return "Pending";
  }

  return "Lost";
}

function deriveSentiment(score: number): LiveCallItem["sentiment"] {
  if (score >= 68) {
    return "negative";
  }

  if (score >= 42) {
    return "neutral";
  }

  return "positive";
}

function createTranscriptMessage(call: AgentLiveCallItem, speaker: LiveCallTranscriptMessage["speaker"], text: string): LiveCallTranscriptMessage {
  return {
    id: `${call.id}-${speaker}-${call.duration}-${Math.random().toString(36).slice(2, 7)}`,
    speaker,
    visibility: "all",
    text,
    createdAt: new Date().toISOString(),
  };
}

function buildLiveCall(campaign: AgentCampaign, lead: AgentLeadItem, index: number, scriptName: string): AgentLiveCallItem {
  const riskScore = clamp(24 + index * 9 + (campaign.persona === "Empathetic" ? -3 : 0), 0, 100);

  return {
    id: `agent-call-${Date.now()}-${index}`,
    agentId: "agent-session",
    agentName: DEFAULT_AGENT_NAME,
    campaignName: campaign.name,
    status: riskScore >= 80 ? "escalated" : riskScore >= 55 ? "at-risk" : "active",
    sentiment: deriveSentiment(riskScore),
    duration: 32 + index * 18,
    currentScriptNode: "qualification",
    transcript: [
      createTranscriptMessage(
        {
          id: `seed-${index}`,
          agentId: "agent-session",
          agentName: DEFAULT_AGENT_NAME,
          campaignName: campaign.name,
          status: "active",
          sentiment: "positive",
          duration: 0,
          currentScriptNode: "greeting",
          transcript: [],
          riskScore,
          riskTrend: "steady",
          isSupervisorJoined: false,
          controlMode: "ai",
          lastUpdatedAt: new Date().toISOString(),
          leadId: lead.id,
          leadName: lead.name,
          scriptName,
        },
        "customer",
        `Hi, this is ${lead.name}. I can take a quick look at the proposal.`
      ),
      createTranscriptMessage(
        {
          id: `seed-${index}`,
          agentId: "agent-session",
          agentName: DEFAULT_AGENT_NAME,
          campaignName: campaign.name,
          status: "active",
          sentiment: "positive",
          duration: 0,
          currentScriptNode: "greeting",
          transcript: [],
          riskScore,
          riskTrend: "steady",
          isSupervisorJoined: false,
          controlMode: "ai",
          lastUpdatedAt: new Date().toISOString(),
          leadId: lead.id,
          leadName: lead.name,
          scriptName,
        },
        "ai",
        "Absolutely. I will keep this focused and cover the next step first."
      ),
    ],
    riskScore,
    riskTrend: "steady",
    isSupervisorJoined: false,
    controlMode: "ai",
    lastUpdatedAt: new Date().toISOString(),
    leadId: lead.id,
    leadName: lead.name,
    scriptName,
  };
}

function normalizeCampaigns(campaigns: AgentCampaign[], activeCalls: AgentLiveCallItem[]) {
  return campaigns.map((campaign) => ({
    ...campaign,
    status: activeCalls.some((call) => call.campaignName === campaign.name) ? "Running" : campaign.status,
  }));
}

function mapPersonaLabel(persona: BackendAgentCampaign["persona"]): AgentCampaign["persona"] {
  const value = `${persona?.name ?? ""} ${persona?.tone ?? ""}`.toLowerCase();
  if (value.includes("friendly")) {
    return "Friendly";
  }
  if (value.includes("empathetic") || value.includes("empathy")) {
    return "Empathetic";
  }
  return "Professional";
}

function mapCampaignStatus(status: string): AgentCampaignStatus {
  if (status === "paused") {
    return "Paused";
  }
  return "Ready";
}

async function syncAgentCampaignsFromApi() {
  if (typeof window === "undefined") {
    return;
  }

  const token = getStoredAuthToken();
  if (!token) {
    return;
  }

  const data = await apiGet<BackendAgentCampaign[]>("/api/agent/campaigns", token);
  const campaigns = data.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    product: campaign.product,
    audience: campaign.audience,
    persona: mapPersonaLabel(campaign.persona),
    personaName: campaign.persona?.name,
    personaTone: campaign.persona?.tone,
    personaDescription: campaign.persona?.description,
    status: mapCampaignStatus(campaign.status),
    leadPool: DEFAULT_LEAD_POOL,
    defaultBatchSize: DEFAULT_BATCH_SIZE,
    lastLaunchedAt: null,
  }));
  const scripts = data
    .filter((campaign) => campaign.script && campaign.script.is_active)
    .map((campaign) => ({
      id: campaign.script!.id,
      campaignId: campaign.id,
      title: campaign.script!.title,
      summary: campaign.script!.summary || "",
      content: campaign.script!.content || "",
    }));

  writeAgentCampaigns(campaigns);
  writeAgentScripts(scripts);
}

export function readAgentCampaigns() {
  return readLocalStorage(AGENT_CAMPAIGNS_KEY, defaultCampaigns);
}

export function writeAgentCampaigns(value: AgentCampaign[]) {
  writeLocalStorage(AGENT_CAMPAIGNS_KEY, value);
  emitAgentStateChange();
}

export function readAgentLeads() {
  return readLocalStorage(AGENT_LEADS_KEY, defaultLeads);
}

export function writeAgentLeads(value: AgentLeadItem[]) {
  writeLocalStorage(AGENT_LEADS_KEY, value);
  emitAgentStateChange();
}

export function readAgentScripts() {
  return readLocalStorage(AGENT_SCRIPTS_KEY, defaultScripts);
}

export function writeAgentScripts(value: AgentScriptItem[]) {
  writeLocalStorage(AGENT_SCRIPTS_KEY, value);
  emitAgentStateChange();
}

export function readAgentCallHistory() {
  return readLocalStorage(AGENT_HISTORY_KEY, defaultHistory);
}

export function writeAgentCallHistory(value: AgentCallHistoryItem[]) {
  writeLocalStorage(AGENT_HISTORY_KEY, value);
  emitAgentStateChange();
}

export function readAgentActiveCalls() {
  return readSupervisorLiveCalls().map((call) => ({
    ...call,
    leadId: (call as AgentLiveCallItem).leadId ?? call.id,
    leadName: (call as AgentLiveCallItem).leadName ?? call.agentName,
    scriptName: (call as AgentLiveCallItem).scriptName ?? "Qualification Flow",
  }));
}

export function writeAgentActiveCalls(value: AgentLiveCallItem[]) {
  writeSupervisorLiveCalls(value);
  emitAgentStateChange();
}

export function launchAgentCampaign(campaignId: string, batchSize: number, scriptName: string) {
  const campaigns = readAgentCampaigns();
  const campaign = campaigns.find((item) => item.id === campaignId);
  if (!campaign) {
    return { launched: 0, calls: [] as AgentLiveCallItem[] };
  }

  const leads = readAgentLeads();
  const activeCalls = readAgentActiveCalls();
  const availableLeads = leads.filter((lead) => lead.campaign === campaign.name);
  const size = Math.min(Math.max(1, batchSize), Math.max(1, campaign.leadPool));

  const calls = Array.from({ length: size }, (_, index) => {
    const lead = availableLeads[index] ?? leads[(index + leads.length) % leads.length];
    return buildLiveCall(campaign, lead, index, scriptName);
  });

  writeAgentActiveCalls([...calls, ...activeCalls]);
  writeAgentCampaigns(
    normalizeCampaigns(
      campaigns.map((item) => (item.id === campaign.id ? { ...item, status: "Running", lastLaunchedAt: new Date().toISOString(), leadPool: Math.max(0, item.leadPool - size) } : item)),
      [...calls, ...activeCalls]
    )
  );

  return { launched: calls.length, calls };
}

export function completeAgentCall(callId: string) {
  const activeCalls = readAgentActiveCalls();
  const call = activeCalls.find((item) => item.id === callId);
  if (!call) {
    return null;
  }

  const nextCalls = activeCalls.filter((item) => item.id !== callId);
  writeAgentActiveCalls(nextCalls);

  const history = readAgentCallHistory();
  const leads = readAgentLeads();
  const matchedLeadIndex = leads.findIndex((lead) => lead.id === call.leadId);
  const leadScore = clamp(48 + (call.sentiment === "positive" ? 26 : call.sentiment === "neutral" ? 10 : -6) - Math.floor(call.riskScore / 4), 0, 100);
  const nextStatus = deriveLeadStatus(leadScore);
  const completedAt = new Date().toISOString();
  const updatedLead = matchedLeadIndex === -1
    ? null
    : {
        ...leads[matchedLeadIndex],
        status: nextStatus,
        score: leadScore,
        lastInteraction: completedAt,
        notes: `Completed from ${call.campaignName} with ${call.sentiment} sentiment and ${call.duration}s duration.`,
        callSummary: `Completed via ${call.scriptName}. Outcome ${deriveOutcome(leadScore)} with lead score ${leadScore}.`,
      };

  if (updatedLead) {
    const nextLeads = [...leads];
    nextLeads[matchedLeadIndex] = updatedLead;
    writeAgentLeads(nextLeads);
  }

  const campaigns = readAgentCampaigns();
  const nextCampaigns = normalizeCampaigns(
    campaigns.map((campaign) =>
      campaign.name === call.campaignName
        ? { ...campaign, status: nextCalls.some((item) => item.campaignName === call.campaignName) ? "Running" : "Ready" }
        : campaign
    ),
    nextCalls
  );
  writeAgentCampaigns(nextCampaigns);

  const nextHistory: AgentCallHistoryItem[] = [
    {
      id: `hist-${Date.now()}`,
      callId: call.id,
      leadId: call.leadId,
      leadName: call.leadName,
      campaignName: call.campaignName,
      duration: call.duration,
      sentiment: call.sentiment,
      outcome: deriveOutcome(leadScore),
      leadScore,
      completedAt,
    },
    ...history,
  ];

  writeAgentCallHistory(nextHistory);
  return nextHistory[0];
}

export function updateAgentLeadStatus(leadId: string, status: LeadStatus) {
  const leads = readAgentLeads();
  const nextLeads = leads.map((lead) => (lead.id === leadId ? { ...lead, status, lastInteraction: new Date().toISOString() } : lead));
  writeAgentLeads(nextLeads);
  return nextLeads;
}

export function updateAgentLeadScore(leadId: string, score: number) {
  const leads = readAgentLeads();
  const nextScore = clamp(score, 0, 100);
  const nextLeads = leads.map((lead) =>
    lead.id === leadId
      ? { ...lead, score: nextScore, status: deriveLeadStatus(nextScore), lastInteraction: new Date().toISOString() }
      : lead
  );
  writeAgentLeads(nextLeads);
  return nextLeads;
}

export function updateAgentLeadFields(
  leadId: string,
  updates: Partial<Omit<AgentLeadItem, "id">>
) {
  const leads = readAgentLeads();
  const nextLeads = leads.map((lead) =>
    lead.id === leadId
      ? { ...lead, ...updates, lastInteraction: new Date().toISOString() }
      : lead
  );
  writeAgentLeads(nextLeads);
  return nextLeads;
}

export function useAgentActiveCalls() {
  const [calls, setCalls] = useState<AgentLiveCallItem[]>(() => readAgentActiveCalls());

  useEffect(() => {
    function sync() {
      setCalls(readAgentActiveCalls());
    }

    sync();
    window.addEventListener(AGENT_STATE_CHANGE_EVENT, sync);
    window.addEventListener(SUPERVISOR_LIVE_CALLS_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(AGENT_STATE_CHANGE_EVENT, sync);
      window.removeEventListener(SUPERVISOR_LIVE_CALLS_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [calls, setCalls] as const;
}

export function useAgentCampaigns() {
  const [campaigns, setCampaigns] = useState<AgentCampaign[]>(() => readAgentCampaigns());

  useEffect(() => {
    function sync() {
      setCampaigns(readAgentCampaigns());
    }

    sync();
    syncAgentCampaignsFromApi().catch(() => null);
    window.addEventListener(AGENT_STATE_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(AGENT_STATE_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [campaigns, setCampaigns] as const;
}

export function useAgentScripts() {
  const [scripts, setScripts] = useState<AgentScriptItem[]>(() => readAgentScripts());

  useEffect(() => {
    function sync() {
      setScripts(readAgentScripts());
    }

    sync();
    window.addEventListener(AGENT_STATE_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(AGENT_STATE_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [scripts, setScripts] as const;
}

export function useAgentCallHistory() {
  const [history, setHistory] = useState<AgentCallHistoryItem[]>(() => readAgentCallHistory());

  useEffect(() => {
    function sync() {
      setHistory(readAgentCallHistory());
    }

    sync();
    window.addEventListener(AGENT_STATE_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(AGENT_STATE_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [history, setHistory] as const;
}

export function useAgentLeads() {
  const [leads, setLeads] = useState<AgentLeadItem[]>(() => readAgentLeads());

  useEffect(() => {
    function sync() {
      setLeads(readAgentLeads());
    }

    sync();
    window.addEventListener(AGENT_STATE_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(AGENT_STATE_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [leads, setLeads] as const;
}

export function agentLeadStatusLabel(status: LeadStatus) {
  return status;
}

export function agentLiveCallLabel(call: AgentLiveCallItem) {
  return `${call.leadName} · ${call.campaignName}`;
}
