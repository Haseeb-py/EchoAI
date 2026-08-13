import PersistedAgentLeadDetailPage from "@/components/dashboard/PersistedAgentLeadDetailPage";

export default function DashboardLeadDetailRoute({ params }: { params: { leadId: string } }) {
  return <PersistedAgentLeadDetailPage leadId={params.leadId} />;
}
