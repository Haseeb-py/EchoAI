import PersistedCallDetailPage from "@/components/dashboard/PersistedCallDetailPage";

export default function DashboardCallCockpitRoute({ params }: { params: { callId: string } }) {
  return <PersistedCallDetailPage callId={params.callId} />;
}
