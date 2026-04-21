"use client";

import { type ReactNode, useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { UserRole } from "@/lib/auth";

const roleMeta: Record<UserRole, { label: string; short: string }> = {
  agent: { label: "Agent", short: "Operational access" },
  supervisor: { label: "Supervisor", short: "Team oversight" },
  admin: { label: "Admin", short: "System control" },
};

export function AuthCard({
  title,
  subtitle,
  role,
  onRoleChange,
  children,
  error,
  ctaLabel,
  busy,
  footer,
}: {
  title: string;
  subtitle: string;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  children: ReactNode;
  error?: string;
  ctaLabel: string;
  busy?: boolean;
  footer: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(25,26,35,0.98),rgba(17,18,26,0.98))] p-5 shadow-[0_30px_80px_rgba(4,5,10,0.55)] backdrop-blur-xl sm:p-7">
      <div className="rounded-[22px] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-5 sm:p-6">
        <div>
          <h2 className="font-headline text-[38px] font-semibold tracking-[-0.03em] text-white">{title}</h2>
          <p className="mt-2 text-[14px] leading-6 text-white/48">{subtitle}</p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 rounded-[18px] border border-white/[0.06] bg-[#0f1119] p-2">
          {(Object.keys(roleMeta) as UserRole[]).map((item) => {
            const active = role === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => onRoleChange(item)}
                className={[
                  "rounded-[14px] border px-2 py-3 text-left transition-all duration-200",
                  active
                    ? "border-[#8f92ff]/35 bg-[#2b2c3c] text-white shadow-[0_0_18px_rgba(143,146,255,0.16)]"
                    : "border-transparent bg-transparent text-white/55 hover:bg-white/[0.04] hover:text-white/78",
                ].join(" ")}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em]">{roleMeta[item].label}</div>
                <div className="mt-1 text-[10px] text-white/38">{roleMeta[item].short}</div>
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="mt-5 flex items-start gap-3 rounded-[16px] border border-[#ff8aa1]/18 bg-[#40212e]/42 px-4 py-3 text-[13px] text-[#ffd3de]">
            <AlertCircle size={16} strokeWidth={2.1} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="mt-5 space-y-4">{children}</div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={busy}
          className="mt-6 !flex !h-12 !w-full !items-center !justify-center !rounded-[14px] !bg-[#b9b7ff] !text-[14px] !font-semibold !tracking-[0.05em] !text-[#23284d] hover:!bg-[#c8c6ff] hover:!shadow-[0_0_28px_rgba(185,183,255,0.38)]"
          rightIcon={<ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />}
        >
          {ctaLabel}
        </Button>

        <div className="mt-6">{footer}</div>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  trailingLabel,
  onTrailingClick,
  autoComplete,
}: {
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  trailingLabel?: string;
  onTrailingClick?: () => void;
  autoComplete?: string;
}) {
  const icon =
    type === "email" ? (
      <Mail size={15} strokeWidth={2} aria-hidden="true" />
    ) : type === "password" ? (
      <LockKeyhole size={15} strokeWidth={2} aria-hidden="true" />
    ) : (
      <UserRound size={15} strokeWidth={2} aria-hidden="true" />
    );

  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-white/54">
        <span>{label}</span>
        {trailingLabel ? (
          <button
            type="button"
            onClick={onTrailingClick}
            className="text-[10px] text-[#b6b7ff] transition-colors hover:text-[#d9daff]"
          >
            {trailingLabel}
          </button>
        ) : null}
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/32">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-[14px] border border-white/[0.08] bg-[#1a1b24] px-12 py-3.5 text-[15px] text-white outline-none transition-all duration-200 placeholder:text-white/24 focus:border-[#7f85ff]/40 focus:bg-[#1d1f2a]"
        />
      </div>
    </label>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  trailingLabel,
  onTrailingClick,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  trailingLabel?: string;
  onTrailingClick?: () => void;
  autoComplete?: string;
}) {
  return <PasswordToggleField label={label} value={value} onChange={onChange} placeholder={placeholder} trailingLabel={trailingLabel} onTrailingClick={onTrailingClick} autoComplete={autoComplete} />;
}

function PasswordToggleField({
  label,
  value,
  onChange,
  placeholder,
  trailingLabel,
  onTrailingClick,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  trailingLabel?: string;
  onTrailingClick?: () => void;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-white/54">
        <span>{label}</span>
        {trailingLabel ? (
          <button
            type="button"
            onClick={onTrailingClick}
            className="text-[10px] text-[#b6b7ff] transition-colors hover:text-[#d9daff]"
          >
            {trailingLabel}
          </button>
        ) : null}
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/32">
          <LockKeyhole size={15} strokeWidth={2} aria-hidden="true" />
        </span>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-[14px] border border-white/[0.08] bg-[#1a1b24] px-12 py-3.5 pr-12 text-[15px] text-white outline-none transition-all duration-200 placeholder:text-white/24 focus:border-[#7f85ff]/40 focus:bg-[#1d1f2a]"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/34 transition-colors hover:text-white/75"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={16} strokeWidth={2} aria-hidden="true" /> : <Eye size={16} strokeWidth={2} aria-hidden="true" />}
        </button>
      </div>
    </label>
  );
}
