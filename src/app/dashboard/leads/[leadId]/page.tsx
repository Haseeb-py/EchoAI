import { AgentLeadDetailPage } from "@/components/dashboard/AgentWorkflows";

export default function DashboardLeadDetailRoute({ params }: { params: { leadId: string } }) {
  return <AgentLeadDetailPage leadId={params.leadId} />;
}
