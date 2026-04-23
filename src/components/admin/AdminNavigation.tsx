"use client";

import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart2,
  Bell,
  BookOpen,
  Database,
  FileBarChart,
  LockKeyhole,
  LogOut,
  LayoutDashboard,
  Megaphone,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  UserCircle2,
  Users,
} from "lucide-react";
import { clearAuthSession } from "@/lib/auth";
import { Button, IconButton } from "@/components/ui/Button";

const adminNavItems = [
  {
    key: "overview",
    label: "Admin Overview",
    description: "Start here for campaign health, setup progress, and admin actions",
    href: "/admin",
    available: true,
    icon: <LayoutDashboard size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    key: "campaigns",
    label: "Campaigns",
    description: "Create, edit, activate, or pause campaigns",
    href: "/admin/campaigns",
    available: true,
    icon: <Megaphone size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    key: "setup",
    label: "Script & Persona Setup",
    description: "Configure scripts, AI personas, and campaign context",
    href: "/admin/setup",
    available: true,
    icon: <SlidersHorizontal size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    key: "users",
    label: "User Management",
    description: "Add agents, add supervisors, unlock and deactivate accounts",
    href: "/admin/users",
    available: true,
    icon: <Users size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    key: "knowledge",
    label: "Knowledge Base",
    description: "Manage product info, FAQs, and objection material",
    href: "/admin/knowledge",
    available: true,
    icon: <BookOpen size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    key: "analytics",
    label: "Global Analytics",
    description: "View system-wide calls, sentiment, funnel, and performance",
    href: "/admin/analytics",
    available: true,
    icon: <BarChart2 size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    key: "leads",
    label: "Leads & CRM",
    description: "View and audit all leads, summaries, and interaction history",
    href: "/admin/leads",
    available: true,
    icon: <Database size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    key: "reports",
    label: "Reports & Exports",
    description: "Export performance reports and campaign data",
    href: "/admin/reports",
    available: true,
    icon: <FileBarChart size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    key: "security",
    label: "Security & Access",
    description: "Review access, account locks, and future audit controls",
    href: "/admin/security",
    available: true,
    icon: <LockKeyhole size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    key: "settings",
    label: "System Settings",
    description: "Manage platform readiness and integration settings",
    href: "/admin/settings",
    available: true,
    icon: <Settings size={16} strokeWidth={1.9} aria-hidden="true" />,
  },
] as const;

type AdminNavKey = (typeof adminNavItems)[number]["key"];

function TooltipLabel({ label, description }: { label: string; description: string }) {
  return (
    <span className="pointer-events-none absolute left-[50px] z-50 hidden w-[230px] rounded-[12px] border border-white/10 bg-[#171b28]/98 p-3 text-left shadow-[0_18px_38px_rgba(5,6,12,0.42)] backdrop-blur-xl group-hover:block">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/86">{label}</span>
      <span className="mt-1 block text-[11px] leading-5 text-white/46">{description}</span>
    </span>
  );
}

function AdminNavButton({
  active,
  icon,
  label,
  description,
  href,
  available,
}: {
  active?: boolean;
  icon: ReactNode;
  label: string;
  description: string;
  href?: string;
  available?: boolean;
}) {
  const className = [
    "group relative grid h-10 w-10 place-items-center rounded-[10px] border transition-all duration-200",
    active
      ? "border-[#6971d6] bg-[#30385f] text-[#cfd1ff] shadow-[0_0_14px_rgba(113,118,255,0.22)]"
      : "border-white/[0.08] bg-white/[0.02] text-white/70 hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white/88",
  ].join(" ");

  const content = (
    <>
      {icon}
      {active ? <span className="absolute -right-[1px] h-7 w-[2px] rounded-full bg-[#b2b7ff]" /> : null}
      {!available ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#f6c56f]" /> : null}
      <TooltipLabel label={label} description={description} />
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        title={available ? label : `${label} - planned`}
        aria-label={label}
        className={className}
        aria-pressed={Boolean(active)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      title={available ? label : `${label} - planned`}
      aria-label={label}
      className={className}
      aria-pressed={Boolean(active)}
    >
      {content}
    </button>
  );
}

export function AdminSidebar({ activeKey = "overview" }: { activeKey?: AdminNavKey }) {
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
      <div className="mb-6 text-center">
        <div className="text-[15px] font-semibold tracking-tight text-[#C9CCFF]">EchoAI</div>
        <div className="mt-1 text-[7px] font-semibold uppercase tracking-[0.18em] text-white/28">Admin</div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-3">
        {adminNavItems.map((item) => (
          <AdminNavButton
            key={item.key}
            active={item.key === activeKey}
            icon={item.icon}
            label={item.label}
            description={item.description}
            href={item.href}
            available={item.available}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-col items-center gap-4 pb-2">
        <div ref={profileRef} className="relative">
          <button
            type="button"
            aria-label="Admin profile"
            aria-expanded={isProfileOpen}
            onClick={() => setIsProfileOpen((current) => !current)}
            className="mt-0.5 grid h-9 w-9 place-items-center rounded-full border border-[#8fdde0]/40 bg-[#7ad3d8]/25 text-[#d8fbfd] shadow-[0_0_12px_rgba(122,211,216,0.3)] transition-all duration-200 hover:bg-[#7ad3d8]/35"
          >
            <UserCircle2 size={16} strokeWidth={1.9} aria-hidden="true" />
          </button>

          {isProfileOpen ? (
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
      </div>
    </aside>
  );
}

export function AdminHeader({
  contextLabel = "Admin Workspace",
  primaryActionLabel = "Create Campaign",
  primaryActionHref = "/admin/campaigns",
  showPrimaryAction = true,
  showInviteAction = true,
}: {
  contextLabel?: string;
  primaryActionLabel?: string;
  primaryActionHref?: string;
  showPrimaryAction?: boolean;
  showInviteAction?: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-5 py-3 md:px-6">
      <div className="relative w-full max-w-[340px]">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35">
          <Search size={15} strokeWidth={2} aria-hidden="true" />
        </span>
        <input
          readOnly
          value=""
          placeholder="Search scripts, campaigns, users..."
          className="w-full rounded-[8px] border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-4 text-[13px] text-white outline-none placeholder:text-white/35"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">
        <span className="rounded-full border border-[#8f92ff]/22 bg-[#8f92ff]/10 px-3 py-1 text-[#cfd2ff]">
          Admin Mode
        </span>
        <span className="rounded-full border border-[#f6c56f]/20 bg-[#f6c56f]/8 px-3 py-1 text-[#f8dc9b]">
          {contextLabel}
        </span>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] font-semibold tracking-[0.14em] text-white/58">
        <span className="inline-flex items-center gap-2 text-white/72">
          <span className="h-1.5 w-1.5 rounded-full bg-[#B5B6FF] shadow-[0_0_8px_rgba(181,182,255,0.8)]" />
          SYSTEM READY
        </span>
        <IconButton
          title="Admin notifications"
          aria-label="Admin notifications"
          className="!h-8 !w-8 !rounded-[9px] !border !border-white/10 !bg-white/[0.03]"
        >
          <Bell size={15} strokeWidth={2} aria-hidden="true" />
        </IconButton>
        {showPrimaryAction ? (
          <Link
            href={primaryActionHref}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-white/15 bg-white/[0.03] px-3.5 text-[11px] font-medium uppercase tracking-[0.11em] text-white transition-all hover:border-white/30 hover:bg-white/[0.06]"
          >
            <Megaphone size={14} strokeWidth={2.1} aria-hidden="true" />
            {primaryActionLabel}
          </Link>
        ) : null}
        {showInviteAction ? (
          <Button
            size="sm"
            className="!h-8 !bg-[#b9b7ff] !px-3.5 !text-[11px] !font-semibold !uppercase !tracking-[0.11em] !text-[#20264b]"
            leftIcon={<Plus size={14} strokeWidth={2.1} aria-hidden="true" />}
          >
            Invite User
          </Button>
        ) : null}
      </div>
    </header>
  );
}
