"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clearAuthSession } from "@/lib/auth";

export default function SessionDock() {
  const router = useRouter();

  async function handleLogout() {
    clearAuthSession();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-[16px] border border-white/10 bg-[#111520]/90 px-3 py-2 shadow-[0_18px_40px_rgba(6,7,14,0.45)] backdrop-blur-xl">
      <Button
        type="button"
        variant="outlined"
        size="sm"
        onClick={handleLogout}
        className="!h-9 !rounded-[10px] !border-white/12 !bg-white/[0.03] !px-3 !text-[12px]"
        leftIcon={<LogOut size={14} strokeWidth={2.1} aria-hidden="true" />}
      >
        Logout
      </Button>
    </div>
  );
}
