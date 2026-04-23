"use client";

import { useMemo, useState } from "react";
import { Bot, CheckCircle2, Cloud, Mic, Phone, Save, Settings, Zap } from "lucide-react";
import {
  AdminFormField,
  AdminMessage,
  AdminPanel,
  AdminScreenShell,
  AdminSelectField,
  AdminStatCard,
  SectionTitle,
} from "@/components/admin/AdminScreenShell";
import { Badge } from "@/components/ui/ui-components";
import { Button } from "@/components/ui/Button";

type IntegrationStatus = "Planned" | "Configured" | "Testing";
type IntegrationItem = {
  id: number;
  name: string;
  purpose: string;
  status: IntegrationStatus;
  icon: React.ReactNode;
};

const modeOptions = ["Demo", "Staging", "Production"] as const;
const languageOptions = ["English", "Urdu", "Arabic"] as const;
const thresholdOptions = ["Negative sentiment", "Strong negative sentiment", "Escalation keyword hit"] as const;

const initialIntegrations: IntegrationItem[] = [
  { id: 1, name: "FastAPI Backend", purpose: "Core API layer", status: "Planned", icon: <Cloud size={16} strokeWidth={2.1} aria-hidden="true" /> },
  { id: 2, name: "Deepgram STT", purpose: "Speech-to-text", status: "Planned", icon: <Mic size={16} strokeWidth={2.1} aria-hidden="true" /> },
  { id: 3, name: "Groq LLM", purpose: "AI response engine", status: "Planned", icon: <Bot size={16} strokeWidth={2.1} aria-hidden="true" /> },
  { id: 4, name: "Twilio Voice", purpose: "Outbound calls", status: "Planned", icon: <Phone size={16} strokeWidth={2.1} aria-hidden="true" /> },
];

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState({
    workspaceName: "EchoAI Admin Workspace",
    maxConcurrentCalls: "100",
    defaultLanguage: "English",
    escalationThreshold: "Negative sentiment",
    mode: "Demo",
  });
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(initialIntegrations);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<number>(initialIntegrations[0].id);
  const [message, setMessage] = useState("System Settings is interactive in the frontend session. Workspace values and integration readiness update instantly.");

  const selectedIntegration = integrations.find((item) => item.id === selectedIntegrationId) || integrations[0];
  const configuredCount = integrations.filter((item) => item.status === "Configured").length;
  const testingCount = integrations.filter((item) => item.status === "Testing").length;

  const updateIntegration = (id: number, status: IntegrationStatus, nextMessage: string) => {
    setIntegrations((currentIntegrations) =>
      currentIntegrations.map((item) => (item.id === id ? { ...item, status } : item))
    );
    setMessage(nextMessage);
  };

  const modeAccent = useMemo(() => {
    if (settings.mode === "Production") return "text-[#a7f3c4]";
    if (settings.mode === "Staging") return "text-[#f6c56f]";
    return "text-[#f3a8ff]";
  }, [settings.mode]);

  return (
    <AdminScreenShell
      activeKey="settings"
      contextLabel="Settings"
      eyebrow="Admin Settings / System Readiness"
      title="System Settings"
      description="Manage workspace configuration, integration readiness, voice service settings, and operational defaults."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Workspace" value="Ready" accent="text-[#a7f3c4]" icon={<CheckCircle2 size={17} strokeWidth={2.1} aria-hidden="true" />} />
        <button type="button" onClick={() => setSelectedIntegrationId(initialIntegrations[0].id)} className="text-left">
          <AdminStatCard label="Integrations" value={String(integrations.length).padStart(2, "0")} accent="text-[#b9b7ff]" icon={<Zap size={17} strokeWidth={2.1} aria-hidden="true" />} />
        </button>
        <button type="button" onClick={() => setMessage("Voice stack depends on Deepgram and Twilio integration readiness.")} className="text-left">
          <AdminStatCard label="Voice Stack" value={configuredCount > 0 ? "Live" : "Plan"} accent="text-[#f6c56f]" icon={<Mic size={17} strokeWidth={2.1} aria-hidden="true" />} />
        </button>
        <AdminStatCard label="Mode" value={settings.mode} accent={modeAccent} icon={<Settings size={17} strokeWidth={2.1} aria-hidden="true" />} />
      </div>

      <AdminMessage>
        {`${message} Configured integrations: ${configuredCount}. Testing integrations: ${testingCount}.`}
      </AdminMessage>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <AdminPanel glow>
          <SectionTitle eyebrow="Workspace Defaults" title="Configuration" />
          <div className="space-y-4">
            <AdminFormField label="Workspace Name" value={settings.workspaceName} onChange={(value) => setSettings((current) => ({ ...current, workspaceName: value }))} />
            <AdminFormField label="Max Concurrent Calls" value={settings.maxConcurrentCalls} onChange={(value) => setSettings((current) => ({ ...current, maxConcurrentCalls: value }))} />
            <AdminSelectField label="Default Language" value={settings.defaultLanguage as (typeof languageOptions)[number]} options={languageOptions} onChange={(value) => setSettings((current) => ({ ...current, defaultLanguage: value }))} />
            <AdminSelectField label="Escalation Threshold" value={settings.escalationThreshold as (typeof thresholdOptions)[number]} options={thresholdOptions} onChange={(value) => setSettings((current) => ({ ...current, escalationThreshold: value }))} />
            <AdminSelectField label="Environment Mode" value={settings.mode as (typeof modeOptions)[number]} options={modeOptions} onChange={(value) => setSettings((current) => ({ ...current, mode: value }))} />
          </div>
          <Button
            type="button"
            fullWidth
            onClick={() => setMessage("Settings saved in the current frontend session. Backend save will be connected later.")}
            className="mt-5 !h-12 !rounded-[12px] !bg-[#b9b7ff] !text-[13px] !font-semibold !uppercase !tracking-[0.12em] !text-[#20264b]"
            leftIcon={<Save size={15} strokeWidth={2.2} aria-hidden="true" />}
          >
            Save Settings
          </Button>
        </AdminPanel>

        <AdminPanel>
          <SectionTitle eyebrow="Integrations" title="Service readiness" />

          {selectedIntegration ? (
            <div className="mb-4 rounded-[16px] border border-[#b9b7ff]/18 bg-[#b9b7ff]/8 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="font-semibold text-white">{selectedIntegration.name}</div>
                <Badge color={selectedIntegration.status === "Configured" ? "success" : selectedIntegration.status === "Testing" ? "tertiary" : "neutral"}>
                  {selectedIntegration.status}
                </Badge>
              </div>
              <p className="text-[12px] leading-5 text-white/46">{selectedIntegration.purpose}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateIntegration(selectedIntegration.id, "Configured", `${selectedIntegration.name} marked as Configured.`)}
                  className="inline-flex h-9 items-center rounded-[10px] border border-white/10 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/68 hover:bg-white/[0.06]"
                >
                  Configure
                </button>
                <button
                  type="button"
                  onClick={() => updateIntegration(selectedIntegration.id, "Testing", `${selectedIntegration.name} moved to Testing.`)}
                  className="inline-flex h-9 items-center rounded-[10px] border border-white/10 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/68 hover:bg-white/[0.06]"
                >
                  Test
                </button>
                <button
                  type="button"
                  onClick={() => updateIntegration(selectedIntegration.id, "Planned", `${selectedIntegration.name} moved back to Planned.`)}
                  className="inline-flex h-9 items-center rounded-[10px] border border-white/10 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/68 hover:bg-white/[0.06]"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {integrations.map((integration) => (
              <button
                key={integration.id}
                type="button"
                onClick={() => {
                  setSelectedIntegrationId(integration.id);
                  setMessage(`${integration.name} selected for settings review.`);
                }}
                className={[
                  "rounded-[16px] border p-4 text-left transition-colors",
                  selectedIntegrationId === integration.id ? "border-[#b9b7ff]/24 bg-[#b9b7ff]/8" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#b9b7ff]/12 text-[#d9dcff]">{integration.icon}</span>
                  <Badge color={integration.status === "Configured" ? "success" : integration.status === "Testing" ? "tertiary" : "neutral"}>
                    {integration.status}
                  </Badge>
                </div>
                <div className="mt-4 font-headline text-[22px] font-semibold tracking-[-0.03em] text-white">{integration.name}</div>
                <p className="mt-2 text-[12px] leading-5 text-white/46">{integration.purpose}</p>
              </button>
            ))}
          </div>
        </AdminPanel>
      </div>
    </AdminScreenShell>
  );
}
