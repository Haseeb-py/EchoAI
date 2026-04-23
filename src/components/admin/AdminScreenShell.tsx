import { ReactNode } from "react";
import { AdminHeader, AdminSidebar } from "@/components/admin/AdminNavigation";
import { Card } from "@/components/ui/ui-components";

type AdminKey = "overview" | "campaigns" | "setup" | "users" | "knowledge" | "analytics" | "leads" | "reports" | "security" | "settings";

export function AdminScreenShell({
  activeKey,
  contextLabel,
  eyebrow,
  title,
  description,
  children,
}: {
  activeKey: AdminKey;
  contextLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080A13] text-white">
      <div className="flex min-h-screen bg-[radial-gradient(circle_at_24%_12%,rgba(118,107,255,0.14),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(242,167,250,0.08),transparent_30%),#0D0F1A]">
        <AdminSidebar activeKey={activeKey} />
        <main className="flex-1">
          <AdminHeader contextLabel={contextLabel} primaryActionLabel="Open Campaigns" primaryActionHref="/admin/campaigns" showInviteAction={false} />
          <section className="px-5 pb-8 pt-5 md:px-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">{eyebrow}</div>
                <h1 className="mt-2 max-w-[820px] font-headline text-[50px] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
                  {title}
                </h1>
                <p className="mt-4 max-w-[760px] text-[14px] leading-7 text-white/56">{description}</p>
              </div>
            </div>
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <Card className="!rounded-[16px] !border-white/[0.06] !bg-[#111420] !p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">{label}</div>
          <div className={`mt-3 font-headline text-[42px] font-semibold leading-none tracking-[-0.04em] ${accent}`}>{value}</div>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-[11px] border border-white/[0.08] bg-white/[0.03] text-white/58">
          {icon}
        </span>
      </div>
    </Card>
  );
}

export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">{eyebrow}</div>
      <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">{title}</h2>
    </div>
  );
}

export function AdminPanel({
  children,
  className = "",
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <Card
      className={[
        "!rounded-[20px] !p-5",
        glow
          ? "!border-[#b9b7ff]/20 !bg-[radial-gradient(circle_at_84%_12%,rgba(185,183,255,0.18),transparent_42%),#111420]"
          : "!border-white/[0.06] !bg-[#111420]",
        className,
      ].join(" ")}
    >
      {children}
    </Card>
  );
}

export function AdminFormField({
  label,
  value,
  onChange,
  type = "text",
  lines = 1,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  lines?: number;
  placeholder?: string;
}) {
  const fieldClass =
    "w-full rounded-[13px] border border-white/[0.08] bg-[#191c28] px-4 py-3 text-[13px] leading-6 text-white/84 outline-none transition-colors placeholder:text-white/28 focus:border-[#b9b7ff]/40";

  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">{label}</span>
      {lines > 1 ? (
        <textarea
          value={value}
          rows={lines}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          className={`${fieldClass} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          className={fieldClass}
        />
      )}
    </label>
  );
}

export function AdminSelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-[13px] border border-white/[0.08] bg-[#191c28] px-4 py-3 text-[13px] leading-6 text-white/84 outline-none focus:border-[#b9b7ff]/40"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#191c28]">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AdminMessage({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] leading-5 text-white/54" aria-live="polite">
      {children}
    </p>
  );
}
