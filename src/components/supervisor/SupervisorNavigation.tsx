"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  Gauge,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Siren,
  UserCircle2,
} from "lucide-react";
import { clearAuthSession } from "@/lib/auth";
import { SearchInput } from "@/components/ui/ui-components";

const supervisorNavItems = [
  { key: "overview", label: "Overview", href: "/supervisor", icon: <LayoutDashboard size={16} strokeWidth={1.9} aria-hidden="true" /> },
  { key: "activity", label: "Team Activity", href: "/supervisor/activity", icon: <Activity size={16} strokeWidth={1.9} aria-hidden="true" /> },
  { key: "escalations", label: "Escalations", href: "/supervisor/escalations", icon: <Siren size={16} strokeWidth={1.9} aria-hidden="true" /> },
  { key: "performance", label: "Performance", href: "/supervisor/performance", icon: <Gauge size={16} strokeWidth={1.9} aria-hidden="true" /> },
  { key: "campaigns", label: "Campaigns", href: "/supervisor/campaigns", icon: <Megaphone size={16} strokeWidth={1.9} aria-hidden="true" /> },
  { key: "alerts", label: "Alerts", href: "/supervisor/alerts", icon: <Bell size={16} strokeWidth={1.9} aria-hidden="true" /> },
  { key: "settings", label: "Settings", href: "/supervisor/settings", icon: <Settings size={16} strokeWidth={1.9} aria-hidden="true" /> },
] as const;

type SupervisorNavKey = (typeof supervisorNavItems)[number]["key"];

function NavButton({ active, href, label, icon }: { active?: boolean; href: string; label: string; icon: ReactNode }) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={[
        "group relative grid h-10 w-10 place-items-center rounded-[10px] border transition-all duration-200",
        active
          ? "border-[#6971d6] bg-[#30385f] text-[#cfd1ff] shadow-[0_0_14px_rgba(113,118,255,0.22)]"
          : "border-white/[0.08] bg-white/[0.02] text-white/70 hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white/88",
      ].join(" ")}
      aria-pressed={Boolean(active)}
    >
      {icon}
      {active ? <span className="absolute -right-[1px] h-7 w-[2px] rounded-full bg-[#b2b7ff]" /> : null}
      <span className="pointer-events-none absolute left-[50px] z-50 hidden whitespace-nowrap rounded-[10px] border border-white/10 bg-[#171b28]/96 px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-white/80 shadow-[0_14px_28px_rgba(5,6,12,0.36)] group-hover:block">
        {label}
      </span>
    </Link>
  );
}

export function SupervisorSidebar({ activeKey }: { activeKey: SupervisorNavKey }) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
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
    setProfileOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-[74px] shrink-0 flex-col items-center border-r border-white/[0.06] bg-[#111520] py-5">
      <div className="mb-6 text-center">
        <div className="text-[15px] font-semibold tracking-tight text-[#C9CCFF]">EchoAI</div>
        <div className="mt-1 text-[7px] font-semibold uppercase tracking-[0.18em] text-white/28">Supervisor</div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-3">
        {supervisorNavItems.map((item) => (
          <NavButton key={item.key} active={item.key === activeKey} href={item.href} label={item.label} icon={item.icon} />
        ))}
      </div>

      <div ref={profileRef} className="relative pb-2">
        <button
          type="button"
          aria-label="Supervisor profile"
          aria-expanded={profileOpen}
          onClick={() => setProfileOpen((current) => !current)}
          className="mt-0.5 grid h-9 w-9 place-items-center rounded-full border border-[#8fdde0]/40 bg-[#7ad3d8]/25 text-[#d8fbfd] shadow-[0_0_12px_rgba(122,211,216,0.3)] transition-all duration-200 hover:bg-[#7ad3d8]/35"
        >
          <UserCircle2 size={16} strokeWidth={1.9} aria-hidden="true" />
        </button>

        {profileOpen ? (
          <div className="absolute bottom-0 left-[52px] z-50 min-w-[154px] rounded-[14px] border border-white/10 bg-[#171b28]/96 p-2 shadow-[0_18px_40px_rgba(6,7,14,0.45)] backdrop-blur-xl">
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
    </aside>
  );
}

export function SupervisorHeader({
  contextLabel,
  activeKey,
}: {
  contextLabel: string;
  activeKey: SupervisorNavKey;
}) {
  const activeItem = useMemo(() => supervisorNavItems.find((item) => item.key === activeKey), [activeKey]);
  const showContextLabel = contextLabel && (!activeItem || contextLabel !== activeItem.label);

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-5 py-3 md:px-6">
      <div className="w-full max-w-[320px]">
        <SearchInput value="" placeholder="Search agents, campaigns, escalations..." readOnly />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">
        <span className="rounded-full border border-[#8f92ff]/22 bg-[#8f92ff]/10 px-3 py-1 text-[#cfd2ff]">Supervisor Mode</span>
        {activeItem ? (
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-white/62">{activeItem.label}</span>
        ) : null}
        {showContextLabel ? (
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-white/62">{contextLabel}</span>
        ) : null}
      </div>
    </header>
  );
}
