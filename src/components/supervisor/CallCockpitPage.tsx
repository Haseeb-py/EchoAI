"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Mic, MicOff, PhoneOff, ShieldCheck, Send, Users } from "lucide-react";
import { Badge, Card, ProgressBar } from "@/components/ui/ui-components";
import { formatLiveCallDuration, getLiveCallScriptProgress, liveCallSentimentLabel, liveCallStatusLabel, LIVE_CALL_SCRIPT_FLOW, useSupervisorLiveCalls } from "@/components/supervisor/live-calls";
import {
  createSupervisorAlert,
  createSupervisorEscalation,
  readSupervisorAlerts,
  readSupervisorEscalations,
  readSupervisorCampaignMonitor,
  removeSupervisorLiveCall,
  type LiveCallItem,
  type LiveCallTranscriptMessage,
  writeSupervisorAlerts,
  writeSupervisorEscalations,
  writeSupervisorLiveCalls,
} from "@/lib/supervisor-state";

const messageTone: Record<LiveCallTranscriptMessage["speaker"], string> = {
  customer: "border-white/[0.06] bg-white/[0.02] text-white/82",
  ai: "border-[#8fdde0]/18 bg-[#8fdde0]/8 text-[#e1fbfd]",
  supervisor: "border-[#b9b7ff]/20 bg-[#b9b7ff]/10 text-[#ececff]",
  system: "border-white/[0.08] bg-white/[0.03] text-white/66",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function deriveStatus(riskScore: number): LiveCallItem["status"] {
  if (riskScore >= 80) {
    return "escalated";
  }

  if (riskScore >= 55) {
    return "at-risk";
  }

  return "active";
}

function deriveSentiment(riskScore: number): LiveCallItem["sentiment"] {
  if (riskScore >= 68) {
    return "negative";
  }

  if (riskScore >= 42) {
    return "neutral";
  }

  return "positive";
}

function createTranscriptMessage(call: LiveCallItem, speaker: LiveCallTranscriptMessage["speaker"], text: string, visibility: LiveCallTranscriptMessage["visibility"] = "all"): LiveCallTranscriptMessage {
  return {
    id: `${call.id}-${speaker}-${call.duration}-${Date.now()}`,
    speaker,
    visibility,
    text,
    createdAt: new Date().toISOString(),
  };
}

export default function CallCockpitPage({ 
  callId, 
  role = "supervisor" 
}: { 
  callId: string
  role?: "supervisor" | "agent"
}) {
  const getBackLink = () => role === "agent" ? "/dashboard/live" : "/supervisor/activity";
  const getDashboardLink = () => role === "agent" ? "/dashboard" : "/supervisor";
  const router = useRouter();
  const [calls, setCalls] = useSupervisorLiveCalls();
  const [whisperDraft, setWhisperDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState("Call cockpit is synced to the live local simulation.");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const call = useMemo(() => calls.find((item) => item.id === callId) ?? null, [calls, callId]);
  const scriptProgress = useMemo(() => (call ? getLiveCallScriptProgress(call) : null), [call]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [call?.transcript.length, call?.duration]);

  function commitCallMutation(mutator: (currentCall: LiveCallItem) => LiveCallItem) {
    setCalls((current) => {
      const nextCalls = current.map((item) => (item.id === callId ? mutator(item) : item));
      writeSupervisorLiveCalls(nextCalls);
      return nextCalls;
    });
  }

  function handleJoin() {
    if (!call) return;

    commitCallMutation((currentCall) => ({
      ...currentCall,
      isSupervisorJoined: true,
      transcript: [...currentCall.transcript, createTranscriptMessage(currentCall, "system", "Supervisor joined the call.")].slice(-24),
      lastUpdatedAt: new Date().toISOString(),
    }));
    setStatusMessage(`Joined ${call.agentName}'s call.`);
  }

  function handleLeave() {
    if (!call) return;

    commitCallMutation((currentCall) => ({
      ...currentCall,
      isSupervisorJoined: false,
      controlMode: "ai",
      transcript: [...currentCall.transcript, createTranscriptMessage(currentCall, "system", "Supervisor left the call.")].slice(-24),
      lastUpdatedAt: new Date().toISOString(),
    }));
    setStatusMessage(`Left ${call.agentName}'s call.`);
  }

  function handleWhisper(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!call || !whisperDraft.trim()) {
      return;
    }

    const whisper = whisperDraft.trim();
    setWhisperDraft("");

    commitCallMutation((currentCall) => {
      const nextRiskScore = clamp(currentCall.riskScore - 2, 0, 100);
      return {
        ...currentCall,
        isSupervisorJoined: true,
        controlMode: "whisper",
        riskScore: nextRiskScore,
        riskTrend: "down",
        sentiment: deriveSentiment(nextRiskScore),
        status: deriveStatus(nextRiskScore),
        transcript: [...currentCall.transcript, createTranscriptMessage(currentCall, "supervisor", whisper, "ai-only")].slice(-24),
        lastUpdatedAt: new Date().toISOString(),
      };
    });
    setStatusMessage("Whisper sent to the AI agent.");
  }

  function handleIntervene() {
    if (!call) return;

    commitCallMutation((currentCall) => {
      const nextRiskScore = clamp(currentCall.riskScore - 6, 0, 100);
      return {
        ...currentCall,
        isSupervisorJoined: true,
        controlMode: "intervene",
        riskScore: nextRiskScore,
        riskTrend: "down",
        sentiment: deriveSentiment(nextRiskScore),
        status: deriveStatus(nextRiskScore),
        transcript: [...currentCall.transcript, createTranscriptMessage(currentCall, "supervisor", "I am taking over this call now." )].slice(-24),
        lastUpdatedAt: new Date().toISOString(),
      };
    });
    setStatusMessage("Supervisor intervention engaged.");
  }

  function handleHangUp() {
    if (!call) return;

    const riskHigh = call.riskScore >= 70 || call.status === "escalated";
    const escalations = readSupervisorEscalations();
    const alerts = readSupervisorAlerts();
    const campaign = readSupervisorCampaignMonitor().find((item) => item.name === call.campaignName);
    const timestamp = new Date().toISOString();

    if (riskHigh) {
      const createdEscalation = createSupervisorEscalation({
        agentId: call.agentId,
        agentName: call.agentName,
        campaignId: campaign?.id ?? call.agentId,
        campaignName: call.campaignName,
        severity: call.riskScore >= 85 ? "critical" : "high",
        status: "new",
        reason: `Call ended from cockpit at risk score ${call.riskScore}.`,
        customer: `${call.agentName} live call`,
        owner: "Supervisor Queue",
        slaMinutes: call.riskScore >= 85 ? 10 : 20,
        notes: [`Live call terminated from cockpit at ${timestamp}.`, `Last script node: ${call.currentScriptNode}`],
      });

      writeSupervisorEscalations([createdEscalation, ...escalations]);
      writeSupervisorAlerts([
        createSupervisorAlert({
          type: "escalation",
          title: "Live call escalated on hang up",
          message: `${call.agentName}'s live call ended with a high-risk state.`,
          relatedId: createdEscalation.id,
          read: false,
          pinned: true,
          snoozedUntil: null,
        }),
        ...alerts,
      ]);
      setStatusMessage("Hang up created a new escalation and alert.");
    } else {
      writeSupervisorAlerts([
        createSupervisorAlert({
          type: "system",
          title: "Live call ended",
          message: `${call.agentName}'s call was ended from the cockpit.`,
          relatedId: call.id,
          read: false,
          pinned: false,
          snoozedUntil: null,
        }),
        ...alerts,
      ]);
      setStatusMessage("Hang up created a call-end alert.");
    }

    removeSupervisorLiveCall(call.id);
    if (role === "agent") {
      router.push("/dashboard/live");
    } else {
      router.push(riskHigh ? "/supervisor/escalations" : "/supervisor/activity");
    }
  }

  if (!call) {
    return (
      <div className="space-y-4">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="text-[14px] text-white/68">This live call is no longer available in the local supervisor store.</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={getBackLink()} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#b9b7ff] px-4 text-[11px] font-semibold uppercase tracking-[0.11em] text-[#20264b] hover:bg-[#c8c6ff]">
              <ArrowLeft size={14} />
              Back to {role === "agent" ? "Calls" : "Activity"}
            </Link>
            <Link href={getDashboardLink()} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-4 text-[11px] font-semibold uppercase tracking-[0.11em] text-white/76 hover:bg-white/[0.06]">
              Open Dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/60">{statusMessage}</p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Call Header</div>
              <h2 className="mt-1 font-headline text-[32px] font-semibold tracking-[-0.04em] text-white">{call.agentName}</h2>
              <div className="mt-2 text-[13px] text-white/55">{call.campaignName}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge color={call.status === "escalated" ? "danger" : call.status === "at-risk" ? "tertiary" : "success"}>{liveCallStatusLabel(call.status)}</Badge>
              <Badge color={call.sentiment === "negative" ? "danger" : call.sentiment === "neutral" ? "tertiary" : "success"}>{liveCallSentimentLabel(call.sentiment)}</Badge>
              <div className="text-right text-[12px] text-white/48">Duration</div>
              <div className="font-headline text-[34px] font-semibold leading-none tracking-[-0.04em] text-[#b9b7ff]">{formatLiveCallDuration(call.duration)}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className={miniCard}>Agent: {call.agentName}</div>
            <div className={miniCard}>Joined: {call.isSupervisorJoined ? "Yes" : "No"}</div>
            <div className={miniCard}>Control: {call.controlMode}</div>
            <div className={miniCard}>Risk: {call.riskScore}%</div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Live Transcript</div>
              <div className="max-h-[520px] space-y-2 overflow-y-auto rounded-[16px] border border-white/[0.06] bg-black/20 p-3">
                {call.transcript.map((message) => (
                  <div key={message.id} className={["rounded-[12px] border px-3 py-2.5 text-[13px] leading-6", messageTone[message.speaker]].join(" ")}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-inherit/65">
                      <span>{message.speaker === "ai" ? "AI Agent" : message.speaker === "customer" ? "Customer" : message.speaker === "supervisor" ? "Supervisor" : "System"}</span>
                      <span>{message.visibility === "ai-only" ? "AI-only whisper" : message.visibility === "supervisor-only" ? "Supervisor only" : "Live"}</span>
                    </div>
                    <div>{message.text}</div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Script Node Tracker</div>
                <div className="space-y-2 rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-3">
                  {LIVE_CALL_SCRIPT_FLOW.map((node, index) => {
                    const isCurrent = node === call.currentScriptNode;
                    const isCompleted = scriptProgress ? index < scriptProgress.currentIndex : false;
                    return (
                      <div key={node} className={["flex items-center gap-3 rounded-[11px] border px-3 py-2 text-[12px]", isCurrent ? "border-[#b9b7ff]/30 bg-[#b9b7ff]/12 text-white" : isCompleted ? "border-white/[0.06] bg-white/[0.02] text-white/56" : "border-transparent bg-transparent text-white/32"].join(" ") }>
                        <div className={["flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold", isCurrent ? "bg-[#b9b7ff] text-[#20264b]" : isCompleted ? "bg-white/12 text-white/70" : "bg-white/[0.06] text-white/42"].join(" ")}>{index + 1}</div>
                        <div className="flex-1 capitalize">{node.replace("-", " ")}</div>
                        {isCurrent ? <ChevronRight size={14} /> : isCompleted ? <ShieldCheck size={14} /> : <ChevronDown size={14} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Sentiment and Risk</div>
                <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3 text-[12px] text-white/58">
                    <span>Current sentiment</span>
                    <span>{call.sentiment}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-[12px] text-white/58">
                    <span>Trend</span>
                    <span>{call.riskTrend === "up" ? "Rising" : call.riskTrend === "down" ? "Cooling" : "Stable"}</span>
                  </div>
                  <ProgressBar className="mt-4" value={call.riskScore} color={call.riskScore >= 80 ? "tertiary" : call.riskScore >= 55 ? "secondary" : "primary"} label="Risk score" showValue />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">{role === "supervisor" ? "Supervisor Controls" : "Call Controls"}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={handleJoin} className={solidButton}><ShieldCheck size={14} /> {role === "supervisor" ? "Join Call" : "Join"}</button>
            <button type="button" onClick={handleLeave} className={ghostButton}><MicOff size={14} /> {role === "supervisor" ? "Leave Call" : "Leave"}</button>
            <button type="button" onClick={handleIntervene} className={ghostButton}><Mic size={14} /> {role === "supervisor" ? "Intervene" : "Speak"}</button>
            <button type="button" onClick={handleHangUp} className={dangerButton}><PhoneOff size={14} /> {role === "supervisor" ? "Hang Up" : "End Call"}</button>
          </div>

          <form onSubmit={handleWhisper} className="mt-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">{role === "supervisor" ? "Whisper to AI" : "Message AI"}</div>
            <textarea value={whisperDraft} onChange={(event) => setWhisperDraft(event.target.value)} placeholder={role === "supervisor" ? "Send a private instruction to the AI agent" : "Send a message to the AI agent"} className="mt-2 h-28 w-full rounded-[12px] border border-white/[0.08] bg-[#191c28] px-3 py-2 text-[13px] text-white/84 outline-none focus:border-[#b9b7ff]/40" />
            <button type="submit" className="mt-2 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#8fdde0] px-4 text-[11px] font-semibold uppercase tracking-[0.11em] text-[#0f2022] hover:bg-[#a7e6e8]">
              <Send size={14} /> {role === "supervisor" ? "Send Whisper" : "Send"}
            </button>
          </form>

          <div className="mt-4 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4 text-[12px] text-white/60">
            <div className="mb-2 flex items-center gap-2 text-white/72">
              <Users size={14} />
              {role === "supervisor" ? "Supervisor Presence" : "Observer Status"}
            </div>
            <div>{call.isSupervisorJoined ? role === "supervisor" ? "Supervisor has joined the live call." : "You've joined the call." : role === "supervisor" ? "Supervisor is observing only." : "You're observing only."}</div>
            <div className="mt-3">Current node: {call.currentScriptNode}</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={getBackLink()} className={linkButton}>
              <ArrowLeft size={14} />
              Back to {role === "agent" ? "Calls" : "Activity"}
            </Link>
            <Link href={getDashboardLink()} className={linkButton}>
              Open Dashboard
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}

const miniCard = "rounded-[11px] border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px] text-white/62";
const solidButton = "inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#b9b7ff] px-4 text-[11px] font-semibold uppercase tracking-[0.11em] text-[#20264b] hover:bg-[#c8c6ff]";
const ghostButton = "inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-4 text-[11px] font-semibold uppercase tracking-[0.11em] text-white/76 hover:bg-white/[0.06]";
const dangerButton = "inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#f6c56f]/20 bg-[#3b2414] px-4 text-[11px] font-semibold uppercase tracking-[0.11em] text-[#f8dc9b] hover:bg-[#4a2d16]";
const linkButton = "inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-4 text-[11px] font-semibold uppercase tracking-[0.11em] text-white/76 hover:bg-white/[0.06]";
