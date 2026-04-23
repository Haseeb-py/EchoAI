"use client";

import { useMemo, useState } from "react";
import { Activity, CheckCircle2, LockKeyhole, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  AdminMessage,
  AdminPanel,
  AdminScreenShell,
  AdminSelectField,
  AdminStatCard,
  SectionTitle,
} from "@/components/admin/AdminScreenShell";
import { Badge } from "@/components/ui/ui-components";

type SecuritySeverity = "Info" | "Warning";
type SecurityEvent = {
  id: number;
  event: string;
  user: string;
  severity: SecuritySeverity;
  time: string;
  context: string;
};

const severityOptions = ["All Events", "Info", "Warning"] as const;

const initialSecurityEvents: SecurityEvent[] = [
  { id: 1, event: "Admin login successful", user: "admin@echoai.local", severity: "Info", time: "Today, 10:24 AM", context: "Primary admin dashboard access approved from known workspace device." },
  { id: 2, event: "Mariam Shah account locked", user: "mariam.agent@echoai.local", severity: "Warning", time: "Yesterday, 06:15 PM", context: "Five failed login attempts triggered automatic lockout protection." },
  { id: 3, event: "Password reset prepared", user: "ayesha.agent@echoai.local", severity: "Info", time: "Apr 22, 2026", context: "Reset workflow prepared from User Management by admin review." },
  { id: 4, event: "Inactive user access blocked", user: "usman.agent@echoai.local", severity: "Warning", time: "Apr 20, 2026", context: "Inactive user attempted access and was blocked by account state policy." },
];

export default function SecurityAccessPage() {
  const [events] = useState<SecurityEvent[]>(initialSecurityEvents);
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<(typeof severityOptions)[number]>("All Events");
  const [selectedEventId, setSelectedEventId] = useState<number>(initialSecurityEvents[0].id);
  const [sessionTimeout, setSessionTimeout] = useState(true);
  const [lockout, setLockout] = useState(true);
  const [adminUnlockOnly, setAdminUnlockOnly] = useState(true);
  const [message, setMessage] = useState("Security & Access is interactive in the frontend session. Filters, event focus, and security rule toggles update immediately.");

  const filteredEvents = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    return events.filter((item) => {
      const matchesQuery =
        !searchText || [item.event, item.user, item.severity, item.time, item.context].some((value) => value.toLowerCase().includes(searchText));
      const matchesSeverity = severityFilter === "All Events" || item.severity === severityFilter;
      return matchesQuery && matchesSeverity;
    });
  }, [events, query, severityFilter]);

  const selectedEvent = filteredEvents.find((item) => item.id === selectedEventId) || filteredEvents[0] || null;
  const warningCount = events.filter((event) => event.severity === "Warning").length;
  const rulesActive = [sessionTimeout, lockout, adminUnlockOnly].filter(Boolean).length;

  return (
    <AdminScreenShell
      activeKey="security"
      contextLabel="Security"
      eyebrow="Admin Security / Access Control"
      title="Security & Access"
      description="Review account lockouts, access events, session rules, and security controls for the EchoAI workspace."
    >
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px]">
        <AdminPanel className="!p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">Security Filters</div>
              <div className="mt-1 text-[14px] font-semibold text-white">Filter security events and review system controls</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSeverityFilter("All Events");
                setSelectedEventId(initialSecurityEvents[0].id);
                setMessage("Security filters reset to the default frontend view.");
              }}
              className="inline-flex h-10 items-center rounded-[10px] border border-white/10 bg-white/[0.03] px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:bg-white/[0.06]"
            >
              Reset View
            </button>
          </div>
        </AdminPanel>
        <AdminSelectField label="Severity Filter" value={severityFilter} options={severityOptions} onChange={setSeverityFilter} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={() => setSeverityFilter("Warning")} className="text-left">
          <AdminStatCard label="Locked Accounts" value={String(warningCount).padStart(2, "0")} accent="text-[#f6c56f]" icon={<LockKeyhole size={17} strokeWidth={2.1} aria-hidden="true" />} />
        </button>
        <AdminStatCard label="Active Sessions" value="18" accent="text-[#b9b7ff]" icon={<Activity size={17} strokeWidth={2.1} aria-hidden="true" />} />
        <button type="button" onClick={() => setSeverityFilter("All Events")} className="text-left">
          <AdminStatCard label="Security Events" value={String(events.length).padStart(2, "0")} accent="text-[#8fdde0]" icon={<ShieldAlert size={17} strokeWidth={2.1} aria-hidden="true" />} />
        </button>
        <AdminStatCard label="Rules Active" value={String(rulesActive).padStart(2, "0")} accent="text-[#a7f3c4]" icon={<ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />} />
      </div>

      <AdminMessage>
        {`${message} Showing ${filteredEvents.length} events. Severity filter: ${severityFilter}.`}
      </AdminMessage>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminPanel>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <SectionTitle eyebrow="Access Log" title="Recent security events" />
            <label className="relative w-full max-w-[320px]">
              <Search size={15} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search events..."
                className="w-full rounded-[10px] border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-4 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-[#b9b7ff]/36"
              />
            </label>
          </div>

          {selectedEvent ? (
            <div className="mb-4 rounded-[15px] border border-[#b9b7ff]/18 bg-[#b9b7ff]/8 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="font-semibold text-white">{selectedEvent.event}</div>
                <Badge color={selectedEvent.severity === "Warning" ? "tertiary" : "primary"}>{selectedEvent.severity}</Badge>
              </div>
              <div className="text-[12px] text-white/44">{selectedEvent.user} / {selectedEvent.time}</div>
              <p className="mt-3 text-[13px] leading-6 text-white/58">{selectedEvent.context}</p>
            </div>
          ) : null}

          <div className="space-y-3">
            {filteredEvents.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedEventId(item.id);
                  setMessage(`${item.event} selected for security review.`);
                }}
                className={[
                  "flex w-full flex-wrap items-center justify-between gap-3 rounded-[15px] border p-4 text-left transition-colors",
                  selectedEventId === item.id ? "border-[#b9b7ff]/24 bg-[#b9b7ff]/8" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <div>
                  <div className="font-semibold text-white">{item.event}</div>
                  <div className="mt-1 text-[12px] text-white/44">{item.user} / {item.time}</div>
                </div>
                <Badge color={item.severity === "Warning" ? "tertiary" : "primary"}>{item.severity}</Badge>
              </button>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel glow>
          <SectionTitle eyebrow="Rules" title="Security controls" />
          <SecurityToggle
            label="30-minute session timeout"
            enabled={sessionTimeout}
            onClick={() => {
              setSessionTimeout((value) => !value);
              setMessage(`Session timeout ${sessionTimeout ? "disabled" : "enabled"} in the frontend security controls.`);
            }}
          />
          <SecurityToggle
            label="Lock account after 5 failed attempts"
            enabled={lockout}
            onClick={() => {
              setLockout((value) => !value);
              setMessage(`Failed-login lockout ${lockout ? "disabled" : "enabled"} in the frontend security controls.`);
            }}
          />
          <SecurityToggle
            label="Admin-only unlock required"
            enabled={adminUnlockOnly}
            onClick={() => {
              setAdminUnlockOnly((value) => !value);
              setMessage(`Admin-only unlock requirement ${adminUnlockOnly ? "disabled" : "enabled"} in the frontend security controls.`);
            }}
          />
        </AdminPanel>
      </div>
    </AdminScreenShell>
  );
}

function SecurityToggle({ label, enabled, onClick }: { label: string; enabled: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mb-3 flex w-full items-center justify-between rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-4 text-left">
      <span className="text-[13px] font-semibold text-white/78">{label}</span>
      <Badge color={enabled ? "success" : "neutral"} icon={enabled ? <CheckCircle2 size={12} strokeWidth={2.2} aria-hidden="true" /> : undefined}>
        {enabled ? "Enabled" : "Off"}
      </Badge>
    </button>
  );
}
