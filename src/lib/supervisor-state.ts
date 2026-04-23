export const SUPERVISOR_TEAM_ACTIVITY_KEY = "echoai_supervisor_team_activity";
export const SUPERVISOR_LIVE_CALLS_KEY = "echoai_supervisor_live_calls";
export const SUPERVISOR_ESCALATIONS_KEY = "echoai_supervisor_escalations";
export const SUPERVISOR_PERFORMANCE_KEY = "echoai_supervisor_performance";
export const SUPERVISOR_CAMPAIGN_MONITOR_KEY = "echoai_supervisor_campaign_monitor";
export const SUPERVISOR_ALERTS_KEY = "echoai_supervisor_alerts";
export const SUPERVISOR_SETTINGS_KEY = "echoai_supervisor_settings";

export const SUPERVISOR_LIVE_CALLS_CHANGE_EVENT = "echoai_supervisor_live_calls_changed";

export type AgentLiveStatus = "online" | "busy" | "away" | "offline" | "onCall" | "wrapping";
export type SentimentLevel = "Positive" | "Neutral" | "Negative";
export type LiveCallStatus = "active" | "at-risk" | "escalated";
export type LiveCallSentiment = "positive" | "neutral" | "negative";
export type LiveCallControlMode = "ai" | "whisper" | "intervene";
export type TranscriptSpeaker = "customer" | "ai" | "supervisor" | "system";
export type TranscriptVisibility = "all" | "ai-only" | "supervisor-only";
export type EscalationSeverity = "low" | "medium" | "high" | "critical";
export type EscalationStatus = "new" | "acknowledged" | "resolved";
export type CampaignState = "active" | "watch" | "paused";
export type AlertType = "escalation" | "performance" | "campaign" | "system";

export type TeamActivityItem = {
  id: string;
  name: string;
  region: string;
  status: AgentLiveStatus;
  activeCalls: number;
  sentiment: SentimentLevel;
  campaignId: string;
  campaignName: string;
  escalationsToday: number;
  utilization: number;
  updatedAt: string;
  note: string;
};

export type LiveCallTranscriptMessage = {
  id: string;
  speaker: TranscriptSpeaker;
  visibility: TranscriptVisibility;
  text: string;
  createdAt: string;
};

export type LiveCallItem = {
  id: string;
  agentId: string;
  agentName: string;
  campaignName: string;
  status: LiveCallStatus;
  sentiment: LiveCallSentiment;
  duration: number;
  currentScriptNode: string;
  transcript: LiveCallTranscriptMessage[];
  riskScore: number;
  riskTrend: "up" | "down" | "steady";
  isSupervisorJoined: boolean;
  controlMode: LiveCallControlMode;
  lastUpdatedAt: string;
};

export type EscalationItem = {
  id: string;
  agentId: string;
  agentName: string;
  campaignId: string;
  campaignName: string;
  severity: EscalationSeverity;
  status: EscalationStatus;
  reason: string;
  customer: string;
  owner: string;
  slaMinutes: number;
  createdAt: string;
  updatedAt: string;
  notes: string[];
};

export type PerformanceAgent = {
  id: string;
  name: string;
  callsHandled: number;
  conversionRate: number;
  positiveSentiment: number;
  avgHandleTime: number;
  escalations: number;
  trend: "up" | "down" | "steady";
};

export type PerformanceState = {
  dateRange: "Today" | "Last 7 Days" | "Last 30 Days";
  metricFocus: "conversion" | "sentiment" | "calls" | "escalations";
  agents: PerformanceAgent[];
};

export type CampaignMonitorItem = {
  id: string;
  name: string;
  owner: string;
  status: CampaignState;
  watchlist: boolean;
  activeAgents: number;
  activeCalls: number;
  health: number;
  sentimentRisk: number;
  updatedAt: string;
};

export type AlertItem = {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  relatedId: string | null;
  read: boolean;
  pinned: boolean;
  snoozedUntil: string | null;
  createdAt: string;
};

export type SupervisorSettings = {
  autoRefreshSeconds: 15 | 30 | 60;
  sentimentEscalationThreshold: "negative" | "strong-negative" | "keyword";
  showOnlyWatchlistByDefault: boolean;
  enableAlertSounds: boolean;
  enableInAppNotifications: boolean;
  defaultLandingRoute: "/supervisor" | "/supervisor/activity" | "/supervisor/escalations";
};

const now = "2026-04-24T12:00:00.000Z";

const defaultTeamActivity: TeamActivityItem[] = [
  {
    id: "agent-01",
    name: "Ayesha Khan",
    region: "Lahore",
    status: "onCall",
    activeCalls: 5,
    sentiment: "Neutral",
    campaignId: "cmp-01",
    campaignName: "Q2 BPO Modernization Sprint",
    escalationsToday: 2,
    utilization: 88,
    updatedAt: now,
    note: "High volume hour",
  },
  {
    id: "agent-02",
    name: "Mariam Shah",
    region: "Karachi",
    status: "busy",
    activeCalls: 3,
    sentiment: "Negative",
    campaignId: "cmp-02",
    campaignName: "Telecom Renewal Pilot",
    escalationsToday: 4,
    utilization: 76,
    updatedAt: now,
    note: "Needs objection support",
  },
  {
    id: "agent-03",
    name: "Hassan Ali",
    region: "Islamabad",
    status: "online",
    activeCalls: 2,
    sentiment: "Positive",
    campaignId: "cmp-03",
    campaignName: "SaaS Expansion Calls",
    escalationsToday: 1,
    utilization: 62,
    updatedAt: now,
    note: "Stable conversion",
  },
  {
    id: "agent-04",
    name: "Noor Fatima",
    region: "Peshawar",
    status: "away",
    activeCalls: 0,
    sentiment: "Neutral",
    campaignId: "cmp-01",
    campaignName: "Q2 BPO Modernization Sprint",
    escalationsToday: 0,
    utilization: 34,
    updatedAt: now,
    note: "On scheduled break",
  },
];

const defaultEscalations: EscalationItem[] = [
  {
    id: "esc-1001",
    agentId: "agent-02",
    agentName: "Mariam Shah",
    campaignId: "cmp-02",
    campaignName: "Telecom Renewal Pilot",
    severity: "critical",
    status: "new",
    reason: "Customer threatened churn",
    customer: "Nexa Telecom",
    owner: "Supervisor Queue",
    slaMinutes: 10,
    createdAt: now,
    updatedAt: now,
    notes: ["Auto-flagged from sentiment threshold"],
  },
  {
    id: "esc-1002",
    agentId: "agent-01",
    agentName: "Ayesha Khan",
    campaignId: "cmp-01",
    campaignName: "Q2 BPO Modernization Sprint",
    severity: "high",
    status: "acknowledged",
    reason: "Repeated price objection",
    customer: "Skyline Ops",
    owner: "Hamza Malik",
    slaMinutes: 25,
    createdAt: now,
    updatedAt: now,
    notes: ["Supervisor sent whisper guidance"],
  },
  {
    id: "esc-1003",
    agentId: "agent-03",
    agentName: "Hassan Ali",
    campaignId: "cmp-03",
    campaignName: "SaaS Expansion Calls",
    severity: "medium",
    status: "resolved",
    reason: "Contract term confusion",
    customer: "Alpha Systems",
    owner: "Sana Javed",
    slaMinutes: 40,
    createdAt: now,
    updatedAt: now,
    notes: ["Shared approved discount matrix"],
  },
];

const defaultPerformance: PerformanceState = {
  dateRange: "Last 7 Days",
  metricFocus: "conversion",
  agents: [
    {
      id: "agent-01",
      name: "Ayesha Khan",
      callsHandled: 124,
      conversionRate: 33,
      positiveSentiment: 71,
      avgHandleTime: 7.8,
      escalations: 8,
      trend: "up",
    },
    {
      id: "agent-02",
      name: "Mariam Shah",
      callsHandled: 98,
      conversionRate: 24,
      positiveSentiment: 56,
      avgHandleTime: 9.4,
      escalations: 12,
      trend: "down",
    },
    {
      id: "agent-03",
      name: "Hassan Ali",
      callsHandled: 113,
      conversionRate: 38,
      positiveSentiment: 79,
      avgHandleTime: 6.9,
      escalations: 5,
      trend: "up",
    },
  ],
};

const defaultCampaignMonitor: CampaignMonitorItem[] = [
  {
    id: "cmp-01",
    name: "Q2 BPO Modernization Sprint",
    owner: "Ayesha Khan",
    status: "active",
    watchlist: false,
    activeAgents: 8,
    activeCalls: 37,
    health: 82,
    sentimentRisk: 21,
    updatedAt: now,
  },
  {
    id: "cmp-02",
    name: "Telecom Renewal Pilot",
    owner: "Mariam Shah",
    status: "watch",
    watchlist: true,
    activeAgents: 5,
    activeCalls: 22,
    health: 59,
    sentimentRisk: 64,
    updatedAt: now,
  },
  {
    id: "cmp-03",
    name: "SaaS Expansion Calls",
    owner: "Hassan Ali",
    status: "active",
    watchlist: false,
    activeAgents: 7,
    activeCalls: 31,
    health: 88,
    sentimentRisk: 16,
    updatedAt: now,
  },
];

const defaultAlerts: AlertItem[] = [
  {
    id: "alt-9001",
    type: "escalation",
    title: "Critical escalation queued",
    message: "Nexa Telecom has entered critical sentiment state.",
    relatedId: "esc-1001",
    read: false,
    pinned: true,
    snoozedUntil: null,
    createdAt: now,
  },
  {
    id: "alt-9002",
    type: "campaign",
    title: "Campaign moved to watch state",
    message: "Telecom Renewal Pilot crossed sentiment risk threshold.",
    relatedId: "cmp-02",
    read: false,
    pinned: false,
    snoozedUntil: null,
    createdAt: now,
  },
  {
    id: "alt-9003",
    type: "performance",
    title: "Conversion dip detected",
    message: "Mariam Shah dropped 6 points week-over-week conversion.",
    relatedId: "agent-02",
    read: true,
    pinned: false,
    snoozedUntil: null,
    createdAt: now,
  },
];

const defaultSettings: SupervisorSettings = {
  autoRefreshSeconds: 30,
  sentimentEscalationThreshold: "negative",
  showOnlyWatchlistByDefault: false,
  enableAlertSounds: true,
  enableInAppNotifications: true,
  defaultLandingRoute: "/supervisor",
};

const defaultLiveCalls: LiveCallItem[] = [
  {
    id: "call-2001",
    agentId: "agent-01",
    agentName: "Ayesha Khan",
    campaignName: "Q2 BPO Modernization Sprint",
    status: "active",
    sentiment: "positive",
    duration: 186,
    currentScriptNode: "qualification",
    transcript: [
      {
        id: "call-2001-msg-1",
        speaker: "customer",
        visibility: "all",
        text: "We are looking for a cleaner rollout plan before we commit.",
        createdAt: now,
      },
      {
        id: "call-2001-msg-2",
        speaker: "ai",
        visibility: "all",
        text: "I can walk through the phased deployment and the risk controls.",
        createdAt: now,
      },
      {
        id: "call-2001-msg-3",
        speaker: "customer",
        visibility: "all",
        text: "That would help if the support handoff is clear.",
        createdAt: now,
      },
    ],
    riskScore: 28,
    riskTrend: "down",
    isSupervisorJoined: false,
    controlMode: "ai",
    lastUpdatedAt: now,
  },
  {
    id: "call-2002",
    agentId: "agent-02",
    agentName: "Mariam Shah",
    campaignName: "Telecom Renewal Pilot",
    status: "at-risk",
    sentiment: "negative",
    duration: 412,
    currentScriptNode: "objection-handling",
    transcript: [
      {
        id: "call-2002-msg-1",
        speaker: "customer",
        visibility: "all",
        text: "This is becoming more expensive than the current contract.",
        createdAt: now,
      },
      {
        id: "call-2002-msg-2",
        speaker: "ai",
        visibility: "all",
        text: "I can show the renewal uplift against current service usage.",
        createdAt: now,
      },
      {
        id: "call-2002-msg-3",
        speaker: "customer",
        visibility: "all",
        text: "I need a reason to keep this live today.",
        createdAt: now,
      },
    ],
    riskScore: 67,
    riskTrend: "up",
    isSupervisorJoined: true,
    controlMode: "whisper",
    lastUpdatedAt: now,
  },
  {
    id: "call-2003",
    agentId: "agent-03",
    agentName: "Hassan Ali",
    campaignName: "SaaS Expansion Calls",
    status: "escalated",
    sentiment: "negative",
    duration: 598,
    currentScriptNode: "close",
    transcript: [
      {
        id: "call-2003-msg-1",
        speaker: "customer",
        visibility: "all",
        text: "Your security terms still need to be clarified.",
        createdAt: now,
      },
      {
        id: "call-2003-msg-2",
        speaker: "ai",
        visibility: "all",
        text: "I can confirm the escalation path and approved compliance language.",
        createdAt: now,
      },
      {
        id: "call-2003-msg-3",
        speaker: "supervisor",
        visibility: "all",
        text: "I am stepping in to confirm the contract exception and next steps.",
        createdAt: now,
      },
    ],
    riskScore: 84,
    riskTrend: "up",
    isSupervisorJoined: true,
    controlMode: "intervene",
    lastUpdatedAt: now,
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

export function readSupervisorTeamActivity() {
  return readLocalStorage(SUPERVISOR_TEAM_ACTIVITY_KEY, defaultTeamActivity);
}

export function writeSupervisorTeamActivity(value: TeamActivityItem[]) {
  writeLocalStorage(SUPERVISOR_TEAM_ACTIVITY_KEY, value);
}

export function readSupervisorLiveCalls() {
  return readLocalStorage(SUPERVISOR_LIVE_CALLS_KEY, defaultLiveCalls);
}

export function writeSupervisorLiveCalls(value: LiveCallItem[]) {
  writeLocalStorage(SUPERVISOR_LIVE_CALLS_KEY, value);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SUPERVISOR_LIVE_CALLS_CHANGE_EVENT));
  }
}

export function updateSupervisorLiveCall(id: string, updater: (call: LiveCallItem) => LiveCallItem) {
  const nextCalls = readSupervisorLiveCalls().map((call) => (call.id === id ? updater(call) : call));
  writeSupervisorLiveCalls(nextCalls);
  return nextCalls;
}

export function removeSupervisorLiveCall(id: string) {
  const nextCalls = readSupervisorLiveCalls().filter((call) => call.id !== id);
  writeSupervisorLiveCalls(nextCalls);
  return nextCalls;
}

export function readSupervisorEscalations() {
  return readLocalStorage(SUPERVISOR_ESCALATIONS_KEY, defaultEscalations);
}

export function writeSupervisorEscalations(value: EscalationItem[]) {
  writeLocalStorage(SUPERVISOR_ESCALATIONS_KEY, value);
}

export function readSupervisorPerformance() {
  return readLocalStorage(SUPERVISOR_PERFORMANCE_KEY, defaultPerformance);
}

export function writeSupervisorPerformance(value: PerformanceState) {
  writeLocalStorage(SUPERVISOR_PERFORMANCE_KEY, value);
}

export function readSupervisorCampaignMonitor() {
  return readLocalStorage(SUPERVISOR_CAMPAIGN_MONITOR_KEY, defaultCampaignMonitor);
}

export function writeSupervisorCampaignMonitor(value: CampaignMonitorItem[]) {
  writeLocalStorage(SUPERVISOR_CAMPAIGN_MONITOR_KEY, value);
}

export function readSupervisorAlerts() {
  return readLocalStorage(SUPERVISOR_ALERTS_KEY, defaultAlerts);
}

export function writeSupervisorAlerts(value: AlertItem[]) {
  writeLocalStorage(SUPERVISOR_ALERTS_KEY, value);
}

export function readSupervisorSettings() {
  return readLocalStorage(SUPERVISOR_SETTINGS_KEY, defaultSettings);
}

export function writeSupervisorSettings(value: SupervisorSettings) {
  writeLocalStorage(SUPERVISOR_SETTINGS_KEY, value);
}

export function createSupervisorAlert(input: Omit<AlertItem, "id" | "createdAt">): AlertItem {
  return {
    ...input,
    id: `alt-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
}

export function createSupervisorEscalation(input: Omit<EscalationItem, "id" | "createdAt" | "updatedAt">): EscalationItem {
  const timestamp = new Date().toISOString();
  return {
    ...input,
    id: `esc-${Date.now()}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
