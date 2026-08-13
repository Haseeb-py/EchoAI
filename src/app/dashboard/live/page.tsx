import { Suspense } from "react";
import TemporaryVoiceLabPage from "@/components/dashboard/TemporaryVoiceLabPage";

export default function DashboardLiveRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080A13] p-6 text-sm text-white/60">Loading voice lab...</div>}>
      <TemporaryVoiceLabPage />
    </Suspense>
  );
}
