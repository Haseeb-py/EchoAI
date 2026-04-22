import Link from "next/link";
import { AudioWaveform, Bell, Plus } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/ui-components";

const navItems = [
  { label: "HOME", href: "/" },
  { label: "DASHBOARD", href: "/dashboard" },
  { label: "SUPERVISOR", href: "/supervisor" },
  { label: "ADMIN", href: "/admin" },
] as const;

export default function AppTopbar({ activeHref }: { activeHref: string }) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-5 py-3 md:px-6">
      <div className="w-full max-w-[250px]">
        <SearchInput value="" placeholder="Search leads..." readOnly />
      </div>

      <nav className="ml-1 flex flex-wrap items-center gap-5 text-[11px] font-semibold tracking-[0.17em] text-white/58">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={activeHref === item.href ? "text-white/95" : "text-white/48 transition-colors hover:text-white/95"}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3 text-[11px] font-semibold tracking-[0.14em] text-white/58">
        <span className="inline-flex items-center gap-2 text-white/72">
          <span className="h-1.5 w-1.5 rounded-full bg-[#B5B6FF] shadow-[0_0_8px_rgba(181,182,255,0.8)]" />
          AI STATUS: OPTIMAL
        </span>
        <IconButton className="!h-8 !w-8 !rounded-[9px] !border !border-white/10 !bg-white/[0.03]">
          <Bell size={15} strokeWidth={2} aria-hidden="true" />
        </IconButton>
        <IconButton className="!h-8 !w-8 !rounded-[9px] !border !border-white/10 !bg-white/[0.03]">
          <AudioWaveform size={15} strokeWidth={2} aria-hidden="true" />
        </IconButton>
        <IconButton className="!h-8 !w-8 !rounded-[9px] !border !border-white/10 !bg-white/[0.03]">
          <Plus size={15} strokeWidth={2} aria-hidden="true" />
        </IconButton>
        <Button
          variant="outlined"
          size="sm"
          className="!h-8 !border-white/15 !bg-white/[0.03] !px-3.5 !text-[11px] !tracking-[0.11em]"
          leftIcon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          }
        >
          AI Command
        </Button>
      </div>
    </header>
  );
}
