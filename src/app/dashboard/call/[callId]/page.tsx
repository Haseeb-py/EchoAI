"use client";

import { AgentScreenShell } from "@/components/dashboard/AgentScreenShell";
import CallCockpitPage from "@/components/supervisor/CallCockpitPage";

export default function DashboardCallCockpitRoute({ params }: { params: { callId: string } }) {
  return (
    <AgentScreenShell
      activeKey="live"
      contextLabel=""
      eyebrow="Agent / Live / Cockpit"
      title="Call Cockpit"
      description="Monitor active call in real-time."
      showContextLabel={false}
    >
      <CallCockpitPage callId={params.callId} role="agent" />
    </AgentScreenShell>
  );
}
