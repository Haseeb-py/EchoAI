"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, Cloud, Mic, RefreshCw, Save, Settings, Zap } from "lucide-react";
import { AdminFormField, AdminMessage, AdminPanel, AdminScreenShell, AdminSelectField, AdminStatCard, SectionTitle } from "@/components/admin/AdminScreenShell";
import { Badge } from "@/components/ui/ui-components";
import { Button } from "@/components/ui/Button";
import { apiGet, apiPut } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

type IntegrationStatus = "configured" | "not_configured" | "pending";
type Integration = { id: string; name: string; purpose: string; status: IntegrationStatus };
type Settings = { workspace_name: string; max_concurrent_calls: number; default_language: "English" | "Urdu" | "Arabic"; environment_mode: "Demo" | "Staging" | "Production"; updated_at: string; integrations: Integration[] };
const defaults: Settings = { workspace_name: "EchoAI Admin Workspace", max_concurrent_calls: 100, default_language: "English", environment_mode: "Demo", updated_at: "", integrations: [] };
const languageOptions = ["English", "Urdu", "Arabic"] as const;
const modeOptions = ["Demo", "Staging", "Production"] as const;

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [message, setMessage] = useState("Loading persisted workspace configuration.");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const data = await apiGet<Settings>("/api/admin/settings", getStoredAuthToken());
      setSettings(data);
      setMessage("Workspace defaults and service readiness are synced with the backend. Provider secrets are never displayed here.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load system settings.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const configuredCount = settings.integrations.filter((item) => item.status === "configured").length;
  const modeAccent = useMemo(() => settings.environment_mode === "Production" ? "text-[#a7f3c4]" : settings.environment_mode === "Staging" ? "text-[#f6c56f]" : "text-[#f3a8ff]", [settings.environment_mode]);
  const save = async () => {
    try {
      setSaving(true);
      const data = await apiPut<Settings>("/api/admin/settings", {
        workspace_name: settings.workspace_name,
        max_concurrent_calls: Number(settings.max_concurrent_calls),
        default_language: settings.default_language,
        environment_mode: settings.environment_mode,
      }, getStoredAuthToken());
      setSettings(data);
      setMessage("Persisted workspace defaults saved. The call limit is enforced when new calls are started.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save system settings.");
    } finally { setSaving(false); }
  };
  return <AdminScreenShell activeKey="settings" contextLabel="Settings" eyebrow="Admin Settings / System Readiness" title="System Settings" description="Manage persisted workspace defaults and inspect service readiness. Provider credentials remain environment-only.">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"><AdminStatCard label="Workspace" value="Ready" accent="text-[#a7f3c4]" icon={<CheckCircle2 size={17} />} /><AdminStatCard label="Integrations" value={String(settings.integrations.length).padStart(2, "0")} accent="text-[#b9b7ff]" icon={<Zap size={17} />} /><AdminStatCard label="Configured" value={String(configuredCount).padStart(2, "0")} accent="text-[#8fdde0]" icon={<Mic size={17} />} /><AdminStatCard label="Mode" value={settings.environment_mode} accent={modeAccent} icon={<Settings size={17} />} /></div>
    <AdminMessage>{message}</AdminMessage>
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.82fr_1.18fr]"><AdminPanel glow><SectionTitle eyebrow="Workspace Defaults" title="Configuration" /><div className="space-y-4"><AdminFormField label="Workspace Name" value={settings.workspace_name} onChange={(workspace_name) => setSettings((current) => ({ ...current, workspace_name }))} /><AdminFormField label="Max Concurrent Calls" value={String(settings.max_concurrent_calls)} onChange={(value) => setSettings((current) => ({ ...current, max_concurrent_calls: Number(value) || 0 }))} /><AdminSelectField label="Default Language" value={settings.default_language} options={languageOptions} onChange={(default_language) => setSettings((current) => ({ ...current, default_language }))} /><AdminSelectField label="Environment Mode" value={settings.environment_mode} options={modeOptions} onChange={(environment_mode) => setSettings((current) => ({ ...current, environment_mode }))} /></div><div className="mt-4 rounded-[12px] border border-[#f6c56f]/18 bg-[#2a2317] p-3 text-[12px] leading-6 text-[#f8dc9b]">The concurrent-call limit is enforced by the backend. Escalation rules and provider credentials remain server-controlled.</div><div className="mt-5 grid grid-cols-2 gap-2"><Button type="button" fullWidth disabled={saving} onClick={() => void save()} className="!h-12 !rounded-[12px] !bg-[#b9b7ff] !text-[13px] !font-semibold !uppercase !tracking-[0.12em] !text-[#20264b]" leftIcon={<Save size={15} />}>Save Settings</Button><button type="button" onClick={() => void load()} className={buttonClass}><RefreshCw size={14} /> Refresh</button></div></AdminPanel><AdminPanel><SectionTitle eyebrow="Integrations" title="Service readiness" /><div className="mt-4 grid gap-3 md:grid-cols-2">{settings.integrations.map((integration) => <IntegrationCard key={integration.id} integration={integration} />)}{!settings.integrations.length ? <div className={empty}>Service readiness is loading.</div> : null}</div></AdminPanel></div>
  </AdminScreenShell>;
}

function IntegrationCard({ integration }: { integration: Integration }) { const Icon = integration.id === "backend" ? Cloud : integration.id === "groq" ? Bot : Mic; const statusLabel = integration.status === "configured" ? "Configured" : integration.status === "pending" ? "Pending" : "Not configured"; return <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.025] p-4"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#b9b7ff]/12 text-[#d9dcff]"><Icon size={16} /></span><Badge color={integration.status === "configured" ? "success" : integration.status === "pending" ? "tertiary" : "neutral"}>{statusLabel}</Badge></div><div className="mt-4 font-headline text-[22px] font-semibold tracking-[-0.03em] text-white">{integration.name}</div><p className="mt-2 text-[12px] leading-5 text-white/46">{integration.purpose}</p></div>; }
const buttonClass = "inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-white/12 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const empty = "rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62";
