 "use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart2,
  LogOut,
  HelpCircle,
  LayoutDashboard,
  Mic,
  PhoneCall,
  Settings,
  UserCircle2,
  Users,
} from "lucide-react";
import { clearAuthSession } from "@/lib/auth";

const sidebarIcons = [
  {
    key: "grid",
    icon: <LayoutDashboard size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    key: "pulse",
    icon: <Mic size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    key: "contacts",
    icon: <PhoneCall size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    key: "analytics",
    icon: <BarChart2 size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    key: "users",
    icon: <Users size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
];

type SidebarIconKey = (typeof sidebarIcons)[number]["key"];

interface SidebarProps {
  activeKey?: SidebarIconKey;
}

function SidebarButton({ active, icon }: { active?: boolean; icon: ReactNode }) {
  return (
    <button
      type="button"
      className={[
        "relative grid h-10 w-10 place-items-center rounded-[10px] border transition-all duration-200",
        active
          ? "border-[#6971d6] bg-[#30385f] text-[#cfd1ff] shadow-[0_0_14px_rgba(113,118,255,0.22)]"
          : "border-white/[0.08] bg-white/[0.02] text-white/70 hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white/88",
      ].join(" ")}
      aria-pressed={Boolean(active)}
    >
      {icon}
      {active ? <span className="absolute -right-[1px] h-7 w-[2px] rounded-full bg-[#b2b7ff]" /> : null}
    </button>
  );
}

function SidebarUtilityButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-8 w-8 place-items-center text-white/72 transition-all duration-200 hover:text-white/92"
    >
      {icon}
    </button>
  );
}

export default function Sidebar({ activeKey = "grid" }: SidebarProps) {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleLogout() {
    clearAuthSession();
    setIsProfileOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-[74px] shrink-0 flex-col items-center border-r border-white/[0.06] bg-[#111520] py-5">
      <div className="mb-6 text-[15px] font-semibold tracking-tight text-[#C9CCFF]">EchoAI</div>

      <div className="flex flex-1 flex-col items-center gap-4">
        {sidebarIcons.map((item) => (
          <SidebarButton key={item.key} active={item.key === activeKey} icon={item.icon} />
        ))}
      </div>

      <div className="mt-3 flex flex-col items-center gap-4 pb-2">
        <SidebarUtilityButton
          label="Settings"
          icon={<Settings size={16} strokeWidth={1.9} aria-hidden="true" />}
        />
        <SidebarUtilityButton
          label="FAQ"
          icon={<HelpCircle size={16} strokeWidth={1.9} aria-hidden="true" />}
        />
        <div ref={profileRef} className="relative">
          <button
            type="button"
            aria-label="Profile"
            aria-expanded={isProfileOpen}
            onClick={() => setIsProfileOpen((current) => !current)}
            className="mt-0.5 grid h-9 w-9 place-items-center rounded-full border border-[#8fdde0]/40 bg-[#7ad3d8]/25 text-[#d8fbfd] shadow-[0_0_12px_rgba(122,211,216,0.3)] transition-all duration-200 hover:bg-[#7ad3d8]/35"
          >
            <UserCircle2 size={16} strokeWidth={1.9} aria-hidden="true" />
          </button>

          {isProfileOpen ? (
            <div className="absolute bottom-0 left-[52px] z-50 min-w-[148px] rounded-[14px] border border-white/10 bg-[#171b28]/96 p-2 shadow-[0_18px_40px_rgba(6,7,14,0.45)] backdrop-blur-xl">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-white/82 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                <LogOut size={14} strokeWidth={2} aria-hidden="true" />
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
