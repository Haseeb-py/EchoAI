"use client";

import { useEffect, useState } from "react";
import {
  readSupervisorLiveCalls,
  SUPERVISOR_LIVE_CALLS_CHANGE_EVENT,
  type LiveCallItem,
  type LiveCallTranscriptMessage,
  writeSupervisorLiveCalls,
} from "@/lib/supervisor-state";

export const LIVE_CALL_SCRIPT_FLOW = [
  "greeting",
  "qualification",
  "discovery",
  "proposal",
  "objection-handling",
  "close",
] as const;

const customerLines: Record<(typeof LIVE_CALL_SCRIPT_FLOW)[number], string[]> = {
  greeting: [
    "Thanks for taking the time.",
    "I just need a quick check on the renewal details.",
  ],
  qualification: [
    "Can you confirm the rollout timeline?",
    "What does support look like after launch?",
  ],
  discovery: [
    "We still need clarity on the contract scope.",
    "Can you map this to our current operating model?",
  ],
  proposal: [
    "That sounds workable if the handoff is smooth.",
    "I want to see the value versus what we already have.",
  ],
  "objection-handling": [
    "This still feels expensive for the team.",
    "I need a better reason to sign off now.",
  ],
  close: [
    "If the final terms hold, we can move ahead.",
    "I just need the approval summary in writing.",
  ],
};

const aiLines: Record<(typeof LIVE_CALL_SCRIPT_FLOW)[number], string[]> = {
  greeting: [
    "Absolutely, I will keep this quick and focused.",
    "I will walk through the key milestones first.",
  ],
  qualification: [
    "The implementation is phased to reduce risk.",
    "We can align support and rollout in the same motion.",
  ],
  discovery: [
    "I can tailor the package to your usage pattern.",
    "That scope can be narrowed without losing coverage.",
  ],
  proposal: [
    "Here is the value path against your current setup.",
    "The commercial model includes a lighter adoption ramp.",
  ],
  "objection-handling": [
    "I hear the concern and can sharpen the pricing case.",
    "Let me address the constraint directly and stay precise.",
  ],
  close: [
    "I will summarize the next step and decision owner.",
    "We are ready to finalize once the approval is confirmed.",
  ],
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getScriptIndex(node: string) {
  const index = LIVE_CALL_SCRIPT_FLOW.indexOf(node as (typeof LIVE_CALL_SCRIPT_FLOW)[number]);
  return index === -1 ? 0 : index;
}

function nextScriptNode(node: string) {
  const index = getScriptIndex(node);
  return LIVE_CALL_SCRIPT_FLOW[Math.min(index + 1, LIVE_CALL_SCRIPT_FLOW.length - 1)];
}

function createTranscriptMessage(call: LiveCallItem, speaker: LiveCallTranscriptMessage["speaker"], text: string, visibility: LiveCallTranscriptMessage["visibility"] = "all"): LiveCallTranscriptMessage {
  return {
    id: `${call.id}-msg-${call.duration}-${speaker}-${Math.random().toString(36).slice(2, 7)}`,
    speaker,
    visibility,
    text,
    createdAt: new Date().toISOString(),
  };
}

function pickLine(lines: string[], seed: number) {
  return lines[seed % lines.length];
}

function deriveSentiment(riskScore: number, controlMode: LiveCallItem["controlMode"]): LiveCallItem["sentiment"] {
  if (controlMode === "intervene" && riskScore < 60) {
    return riskScore < 35 ? "positive" : "neutral";
  }

  if (riskScore >= 68) {
    return "negative";
  }

  if (riskScore >= 42) {
    return "neutral";
  }

  return "positive";
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

function advanceCall(call: LiveCallItem, index: number): LiveCallItem {
  const nextDuration = call.duration + 1;
  const controlMode = call.controlMode;
  let riskDelta = 0;
  const transcript = [...call.transcript];
  let currentScriptNode = call.currentScriptNode;

  if (nextDuration % 6 === 0 && currentScriptNode !== "close") {
    currentScriptNode = nextScriptNode(currentScriptNode);
    transcript.push(
      createTranscriptMessage(
        call,
        controlMode === "intervene" ? "supervisor" : "ai",
        controlMode === "intervene"
          ? "I am taking the next step on this call now."
          : `Moving into ${currentScriptNode} and keeping the flow on track.`
      )
    );
  }

  if (nextDuration % 4 === 0) {
    const scriptIndex = getScriptIndex(currentScriptNode);
    const nextSpeaker = nextDuration % 8 === 0 ? "customer" : controlMode === "intervene" ? "supervisor" : "ai";
    const lineBank = nextSpeaker === "customer" ? customerLines : aiLines;
    const scriptNode = currentScriptNode in lineBank ? (currentScriptNode as keyof typeof lineBank) : "greeting";
    const text = pickLine(lineBank[scriptNode], nextDuration + index + scriptIndex);
    transcript.push(createTranscriptMessage(call, nextSpeaker, text, nextSpeaker === "supervisor" && controlMode === "whisper" ? "ai-only" : "all"));
  }

  if (currentScriptNode === "objection-handling" || currentScriptNode === "close") {
    riskDelta += nextDuration % 3 === 0 ? 2 : 1;
  } else if (currentScriptNode === "qualification") {
    riskDelta += nextDuration % 5 === 0 ? 1 : 0;
  } else if (currentScriptNode === "discovery") {
    riskDelta += nextDuration % 7 === 0 ? 1 : -1;
  } else {
    riskDelta += -1;
  }

  if (controlMode === "whisper") {
    riskDelta -= 1;
  }

  if (controlMode === "intervene") {
    riskDelta -= 2;
  }

  const nextRiskScore = clamp(call.riskScore + riskDelta, 0, 100);
  const nextStatus = deriveStatus(nextRiskScore);
  const nextSentiment = deriveSentiment(nextRiskScore, controlMode);

  return {
    ...call,
    duration: nextDuration,
    currentScriptNode,
    transcript: transcript.slice(-24),
    riskScore: nextRiskScore,
    riskTrend: riskDelta > 0 ? "up" : riskDelta < 0 ? "down" : "steady",
    status: nextStatus,
    sentiment: nextSentiment,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function useSupervisorLiveCalls() {
  const [calls, setCalls] = useState<LiveCallItem[]>(() => readSupervisorLiveCalls());

  useEffect(() => {
    function sync() {
      setCalls(readSupervisorLiveCalls());
    }

    sync();
    window.addEventListener(SUPERVISOR_LIVE_CALLS_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(SUPERVISOR_LIVE_CALLS_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [calls, setCalls] as const;
}

export function SupervisorLiveCallEngine() {
  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentCalls = readSupervisorLiveCalls();
      const nextCalls = currentCalls.map((call, index) => advanceCall(call, index));
      writeSupervisorLiveCalls(nextCalls);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return null;
}

export function formatLiveCallDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function liveCallStatusLabel(status: LiveCallItem["status"]) {
  if (status === "escalated") {
    return "Escalated";
  }

  if (status === "at-risk") {
    return "At Risk";
  }

  return "Active";
}

export function liveCallSentimentLabel(sentiment: LiveCallItem["sentiment"]) {
  return sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
}

export function getLiveCallScriptProgress(call: LiveCallItem) {
  const currentIndex = getScriptIndex(call.currentScriptNode);
  return {
    currentIndex,
    total: LIVE_CALL_SCRIPT_FLOW.length,
    currentNode: LIVE_CALL_SCRIPT_FLOW[currentIndex],
  };
}
