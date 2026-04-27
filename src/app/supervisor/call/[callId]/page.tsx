"use client";

import { SupervisorScreenShell } from "@/components/supervisor/SupervisorScreenShell";
import CallCockpitPage from "@/components/supervisor/CallCockpitPage";

export default function SupervisorCallCockpitRoute({ params }: { params: { callId: string } }) {
  const { callId } = params;
  return (
    <SupervisorScreenShell
      activeKey="activity"
      contextLabel="Live Call Cockpit"
      eyebrow="Supervisor / Live Call"
      title="Call Cockpit"
      description="Watch the call in motion, whisper to the AI, intervene when needed, and end the session with the outcome captured locally."
    >
      <CallCockpitPage callId={callId} role="supervisor" />
    </SupervisorScreenShell>
  );
}
