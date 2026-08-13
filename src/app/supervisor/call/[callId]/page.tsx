import PersistedSupervisorCallCockpitPage from "@/components/supervisor/PersistedSupervisorCallCockpitPage";

export default function SupervisorCallCockpitRoute({ params }: { params: { callId: string } }) {
  return <PersistedSupervisorCallCockpitPage callId={params.callId} />;
}
