"use client";

import { useEffect, useState } from "react";
import { Bell, Save } from "lucide-react";
import { SupervisorScreenShell } from "@/components/supervisor/SupervisorScreenShell";
import { Card } from "@/components/ui/ui-components";
import {
  createSupervisorAlert,
  readSupervisorAlerts,
  readSupervisorSettings,
  writeSupervisorAlerts,
  writeSupervisorSettings,
  type SupervisorSettings,
} from "@/lib/supervisor-state";

export default function SupervisorSettingsPage() {
  const [settings, setSettings] = useState(readSupervisorSettings);
  const [message, setMessage] = useState("Supervisor settings are auto-persisted to localStorage.");

  useEffect(() => {
    setSettings(readSupervisorSettings());
  }, []);

  useEffect(() => {
    writeSupervisorSettings(settings);
  }, [settings]);

  function resetDefaults() {
    const defaults: SupervisorSettings = {
      autoRefreshSeconds: 30,
      sentimentEscalationThreshold: "negative",
      showOnlyWatchlistByDefault: false,
      enableAlertSounds: true,
      enableInAppNotifications: true,
      defaultLandingRoute: "/supervisor",
    };
    setSettings(defaults);
    setMessage("Settings reset to supervisor defaults.");
  }

  function saveMessage() {
    setMessage("Settings saved in local simulation store.");
  }

  function pushTestAlert() {
    const alerts = readSupervisorAlerts();
    writeSupervisorAlerts([
      createSupervisorAlert({
        type: "system",
        title: "Supervisor settings test",
        message: "Settings panel successfully triggered a test alert.",
        relatedId: null,
        read: false,
        pinned: false,
        snoozedUntil: null,
      }),
      ...alerts,
    ]);
    setMessage("Test alert added to Alerts screen.");
  }

  return (
    <SupervisorScreenShell
      activeKey="settings"
      contextLabel="Settings"
      eyebrow="Supervisor / Preferences"
      title="Supervisor Settings"
      description="Configure threshold preferences, notification behavior, and default supervisor landing behavior."
    >
      <p className="mb-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Automation Preferences</div>
          <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Defaults</h2>

          <div className="mt-4 space-y-3">
            <label className={fieldWrap}>
              <span className={fieldLabel}>Auto Refresh</span>
              <select value={settings.autoRefreshSeconds} onChange={(event) => setSettings((current) => ({ ...current, autoRefreshSeconds: Number(event.target.value) as 15 | 30 | 60 }))} className={fieldInput}>
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
              </select>
            </label>

            <label className={fieldWrap}>
              <span className={fieldLabel}>Escalation Threshold</span>
              <select value={settings.sentimentEscalationThreshold} onChange={(event) => setSettings((current) => ({ ...current, sentimentEscalationThreshold: event.target.value as SupervisorSettings["sentimentEscalationThreshold"] }))} className={fieldInput}>
                <option value="negative">Negative sentiment</option>
                <option value="strong-negative">Strong negative sentiment</option>
                <option value="keyword">Escalation keyword hit</option>
              </select>
            </label>

            <label className={fieldWrap}>
              <span className={fieldLabel}>Default Landing</span>
              <select value={settings.defaultLandingRoute} onChange={(event) => setSettings((current) => ({ ...current, defaultLandingRoute: event.target.value as SupervisorSettings["defaultLandingRoute"] }))} className={fieldInput}>
                <option value="/supervisor">Overview</option>
                <option value="/supervisor/activity">Activity</option>
                <option value="/supervisor/escalations">Escalations</option>
              </select>
            </label>
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Notifications</div>
          <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Behavior</h2>

          <div className="mt-4 space-y-3">
            <ToggleRow label="Enable alert sounds" enabled={settings.enableAlertSounds} onToggle={() => setSettings((current) => ({ ...current, enableAlertSounds: !current.enableAlertSounds }))} />
            <ToggleRow label="Enable in-app notifications" enabled={settings.enableInAppNotifications} onToggle={() => setSettings((current) => ({ ...current, enableInAppNotifications: !current.enableInAppNotifications }))} />
            <ToggleRow label="Watchlist-only default filter" enabled={settings.showOnlyWatchlistByDefault} onToggle={() => setSettings((current) => ({ ...current, showOnlyWatchlistByDefault: !current.showOnlyWatchlistByDefault }))} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={saveMessage} className={solidBtn}><Save size={13} /> Save Preferences</button>
            <button type="button" onClick={resetDefaults} className={ghostBtn}>Reset Defaults</button>
          </div>

          <button type="button" onClick={pushTestAlert} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]">
            <Bell size={13} /> Send Test Alert
          </button>
        </Card>
      </div>
    </SupervisorScreenShell>
  );
}

function ToggleRow({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center justify-between rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left hover:bg-white/[0.05]">
      <span className="text-[13px] text-white/76">{label}</span>
      <span className={enabled ? "rounded-full bg-[#213528] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#bff3cb]" : "rounded-full bg-[#3b252d] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#ffd1db]"}>{enabled ? "On" : "Off"}</span>
    </button>
  );
}

const fieldWrap = "block rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3";
const fieldLabel = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/42";
const fieldInput = "h-[42px] w-full rounded-[10px] border border-white/[0.08] bg-[#191c28] px-3 text-[13px] text-white/84 outline-none focus:border-[#b9b7ff]/40";
const ghostBtn = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const solidBtn = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#b9b7ff] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#20264b] hover:bg-[#c8c6ff]";
