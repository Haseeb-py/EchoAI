import ProtectedLanding from "@/components/auth/ProtectedLanding";

export default function AdminPage() {
  return <ProtectedLanding role="admin" />;
}
