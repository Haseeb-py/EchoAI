"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, TrendingUp } from "lucide-react";
import { SupervisorScreenShell } from "@/components/supervisor/SupervisorScreenShell";
import { Badge, Card, ProgressBar } from "@/components/ui/ui-components";
import {
  readSupervisorPerformance,
  writeSupervisorPerformance,
  type PerformanceAgent,
  type PerformanceState,
} from "@/lib/supervisor-state";

export default function PerformancePage() {
  const [performance, setPerformance] = useState(readSupervisorPerformance);
  const [sortBy, setSortBy] = useState<"conversion" | "sentiment" | "calls" | "escalations">("conversion");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("Performance metrics are adjustable for simulation.");

  useEffect(() => {
    const next = readSupervisorPerformance();
    setPerformance(next);
    setSelectedId(next.agents[0]?.id ?? null);
  }, []);

  useEffect(() => {
    writeSupervisorPerformance(performance);
  }, [performance]);

  const sortedAgents = useMemo(() => {
    return [...performance.agents].sort((a, b) => {
      if (sortBy === "calls") return b.callsHandled - a.callsHandled;
      if (sortBy === "sentiment") return b.positiveSentiment - a.positiveSentiment;
      if (sortBy === "escalations") return a.escalations - b.escalations;
      return b.conversionRate - a.conversionRate;
    });
  }, [performance.agents, sortBy]);

  const selected = sortedAgents.find((agent) => agent.id === selectedId) || sortedAgents[0] || null;

  const summary = useMemo(() => {
    const totals = performance.agents.reduce(
      (acc, agent) => {
        acc.calls += agent.callsHandled;
        acc.conversion += agent.conversionRate;
        acc.sentiment += agent.positiveSentiment;
        acc.escalations += agent.escalations;
        return acc;
      },
      { calls: 0, conversion: 0, sentiment: 0, escalations: 0 }
    );

    const count = Math.max(1, performance.agents.length);

    return {
      calls: totals.calls,
      conversion: Math.round(totals.conversion / count),
      sentiment: Math.round(totals.sentiment / count),
      escalations: totals.escalations,
    };
  }, [performance.agents]);

  function updateAgent(id: string, updater: (agent: PerformanceAgent) => PerformanceAgent) {
    setPerformance((current: PerformanceState) => ({
      ...current,
      agents: current.agents.map((agent) => (agent.id === id ? updater(agent) : agent)),
    }));
  }

  function adjustSelected(delta: number) {
    if (!selected) return;
    updateAgent(selected.id, (agent) => ({
      ...agent,
      conversionRate: Math.max(0, Math.min(100, agent.conversionRate + delta)),
      positiveSentiment: Math.max(0, Math.min(100, agent.positiveSentiment + delta)),
      callsHandled: Math.max(0, agent.callsHandled + delta * 3),
    }));
    setMessage(`${selected.name} metrics adjusted by ${delta > 0 ? "+" : ""}${delta}.`);
  }

  return (
    <SupervisorScreenShell
      activeKey="performance"
      contextLabel="Performance"
      eyebrow="Supervisor / Team Performance"
      title="Performance Analytics"
      description="Analyze performance, sort team output, and tune simulation metrics for planning and review."
    >
      <p className="mb-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{message}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Calls" value={String(summary.calls)} accent="text-[#b9b7ff]" />
        <StatCard label="Avg Conversion" value={`${summary.conversion}%`} accent="text-[#a7f3c4]" />
        <StatCard label="Avg Sentiment" value={`${summary.sentiment}%`} accent="text-[#8fdde0]" />
        <StatCard label="Escalations" value={String(summary.escalations)} accent="text-[#f6c56f]" />
      </div>

      <Card className="mt-4 !rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select value={performance.dateRange} onChange={(event) => setPerformance((current) => ({ ...current, dateRange: event.target.value as PerformanceState["dateRange"] }))} className={inputClass}>
            <option value="Today">Today</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
          </select>
          <select value={performance.metricFocus} onChange={(event) => setPerformance((current) => ({ ...current, metricFocus: event.target.value as PerformanceState["metricFocus"] }))} className={inputClass}>
            <option value="conversion">Conversion Focus</option>
            <option value="sentiment">Sentiment Focus</option>
            <option value="calls">Calls Focus</option>
            <option value="escalations">Escalation Focus</option>
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className={inputClass}>
            <option value="conversion">Sort by conversion</option>
            <option value="sentiment">Sort by sentiment</option>
            <option value="calls">Sort by calls</option>
            <option value="escalations">Sort by escalations</option>
          </select>
          <button type="button" onClick={() => setSortBy((current) => (current === "conversion" ? "sentiment" : current === "sentiment" ? "calls" : current === "calls" ? "escalations" : "conversion"))} className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[12px] border border-white/12 bg-white/[0.02] text-[12px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:bg-white/[0.05]">
            <ArrowUpDown size={14} strokeWidth={2.1} />
            Cycle Sort
          </button>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Team Leaderboard</h2>
            <Badge color="neutral">{performance.dateRange}</Badge>
          </div>
          <div className="space-y-2.5">
            {sortedAgents.map((agent) => (
              <button key={agent.id} type="button" onClick={() => setSelectedId(agent.id)} className={["w-full rounded-[13px] border p-3 text-left transition-colors", selected?.id === agent.id ? "border-[#b9b7ff]/28 bg-[#b9b7ff]/10" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"].join(" ")}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-semibold text-white">{agent.name}</div>
                    <div className="mt-1 text-[12px] text-white/50">Calls {agent.callsHandled} • Esc {agent.escalations}</div>
                  </div>
                  <Badge color={agent.trend === "up" ? "success" : agent.trend === "down" ? "danger" : "neutral"}>{agent.trend.toUpperCase()}</Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-white/60">
                  <span>Conv {agent.conversionRate}%</span>
                  <span>Sent {agent.positiveSentiment}%</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          {selected ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">{selected.name}</h2>
                <Badge color="primary">Focus</Badge>
              </div>
              <div className="space-y-3">
                <ProgressBar value={selected.conversionRate} color="primary" label="Conversion rate" showValue />
                <ProgressBar value={selected.positiveSentiment} color="secondary" label="Positive sentiment" showValue />
                <ProgressBar value={Math.max(0, 100 - selected.escalations * 5)} color="tertiary" label="Escalation stability" showValue />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => adjustSelected(2)} className={solidBtn}><TrendingUp size={13} /> Boost +2</button>
                <button type="button" onClick={() => adjustSelected(-2)} className={ghostBtn}>Adjust -2</button>
              </div>
            </>
          ) : (
            <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/62">No team members available.</div>
          )}
        </Card>
      </div>
    </SupervisorScreenShell>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">{label}</div>
      <div className={`mt-3 font-headline text-[42px] font-semibold leading-none tracking-[-0.04em] ${accent}`}>{value}</div>
    </Card>
  );
}

const inputClass = "h-[46px] rounded-[12px] border border-white/[0.08] bg-[#191c28] px-3 text-[13px] text-white/84 outline-none focus:border-[#b9b7ff]/40";
const ghostBtn = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/74 hover:bg-white/[0.06]";
const solidBtn = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#b9b7ff] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#20264b] hover:bg-[#c8c6ff]";
