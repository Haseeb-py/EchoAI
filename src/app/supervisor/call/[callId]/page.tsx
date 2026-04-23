import CallCockpitPage from "@/components/supervisor/CallCockpitPage";

export default function SupervisorCallCockpitRoute({ params }: { params: { callId: string } }) {
  const { callId } = params;
  return <CallCockpitPage callId={callId} />;
}
