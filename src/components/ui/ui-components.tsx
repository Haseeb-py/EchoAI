/**
 * ui-components.tsx
 * Smaller UI atoms extracted from the Stitch design system:
 * Badge · StatusDot · ProgressBar · SearchInput · Card
 */

import React from "react";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────
// BADGE
// ────────────────────────────────────────────────────────────
type BadgeColor = "primary" | "secondary" | "tertiary" | "success" | "danger" | "neutral";

interface BadgeProps {
  color?:     BadgeColor;
  children:   React.ReactNode;
  icon?:      React.ReactNode;
  className?: string;
}

const badgeColors: Record<BadgeColor, string> = {
  primary:   "bg-[#6366F1]/15 text-[#9899F5]",
  secondary: "bg-[#D946EF]/15 text-[#EFA8FB]",
  tertiary:  "bg-[#F59E0B]/15 text-[#FCD34D]",
  success:   "bg-green-500/15  text-green-400",
  danger:    "bg-red-500/15    text-red-400",
  neutral:   "bg-white/10     text-white/60",
};

export const Badge: React.FC<BadgeProps> = ({
  color = "neutral",
  children,
  icon,
  className,
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[6px]",
      "font-['Inter'] text-[0.75rem] font-medium leading-4",
      badgeColors[color],
      className
    )}
  >
    {icon && <span className="w-3 h-3 flex-shrink-0">{icon}</span>}
    {children}
  </span>
);

// ────────────────────────────────────────────────────────────
// STATUS DOT — for agent/call states
// ────────────────────────────────────────────────────────────
type AgentStatus = "online" | "busy" | "away" | "offline" | "onCall" | "wrapping";

interface StatusDotProps {
  status:     AgentStatus;
  showLabel?: boolean;
  size?:      "sm" | "md";
  className?: string;
}

const statusConfig: Record<AgentStatus, { dot: string; label: string }> = {
  online:   { dot: "bg-green-400  shadow-[0_0_6px_rgba(74,222,128,0.6)]",  label: "Online" },
  busy:     { dot: "bg-red-400    shadow-[0_0_6px_rgba(248,113,113,0.6)]", label: "Busy" },
  away:     { dot: "bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]",  label: "Away" },
  offline:  { dot: "bg-white/20",                                           label: "Offline" },
  onCall:   { dot: "bg-[#6366F1]  shadow-[0_0_6px_rgba(99,102,241,0.6)]",  label: "On Call" },
  wrapping: { dot: "bg-[#D946EF]  shadow-[0_0_6px_rgba(217,70,239,0.5)]",  label: "Wrapping" },
};

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  showLabel = false,
  size = "md",
  className,
}) => {
  const cfg = statusConfig[status];
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("rounded-full flex-shrink-0", dotSize, cfg.dot)} />
      {showLabel && (
        <span className="font-['Inter'] text-[0.75rem] text-white/60">
          {cfg.label}
        </span>
      )}
    </span>
  );
};

// ────────────────────────────────────────────────────────────
// PROGRESS BAR — matches the 3 colored bars in Stitch
// ────────────────────────────────────────────────────────────
type ProgressColor = "primary" | "secondary" | "tertiary";

interface ProgressBarProps {
  value:      number;       // 0–100
  color?:     ProgressColor;
  label?:     string;
  showValue?: boolean;
  className?: string;
}

const progressColors: Record<ProgressColor, string> = {
  primary:   "bg-[#6366F1]",
  secondary: "bg-[#D946EF]",
  tertiary:  "bg-[#F59E0B]",
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = "primary",
  label,
  showValue = false,
  className,
}) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label   && <span className="font-['Inter'] text-[0.75rem] text-white/50">{label}</span>}
          {showValue && <span className="font-['Inter'] text-[0.75rem] text-white/50">{clamped}%</span>}
        </div>
      )}
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", progressColors[color])}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// SEARCH INPUT — matches the search bar in Stitch
// ────────────────────────────────────────────────────────────
interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  className,
  value,
  onClear,
  ...props
}) => (
  <div className={cn("relative w-full", className)}>
    {/* Search icon */}
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    </span>

    <input
      value={value}
      className={cn(
        "w-full bg-white/5 border border-white/10 rounded-[8px]",
        "pl-10 pr-4 py-2.5",
        "font-['Inter'] text-[0.875rem] text-white",
        "placeholder:text-white/35",
        "focus:outline-none focus:border-[#6366F1]/60 focus:bg-white/8",
        "transition-all duration-200"
      )}
      {...props}
    />

    {/* Clear button */}
    {value && onClear && (
      <button
        onClick={onClear}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors"
        type="button"
        aria-label="Clear search"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    )}
  </div>
);

// ────────────────────────────────────────────────────────────
// CARD — base container matching Stitch dark card style
// ────────────────────────────────────────────────────────────
interface CardProps {
  children:   React.ReactNode;
  className?: string;
  hover?:     boolean;
  padding?:   "none" | "sm" | "md" | "lg";
  onClick?:   () => void;
}

const cardPadding = {
  none: "",
  sm:   "p-3",
  md:   "p-5",
  lg:   "p-6",
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = false,
  padding = "md",
  onClick,
}) => (
  <div
    onClick={onClick}
    className={cn(
      "bg-[#141418] border border-white/[0.08] rounded-[16px]",
      "shadow-[0_1px_3px_rgba(0,0,0,0.4),0_4px_16px_rgba(0,0,0,0.3)]",
      "transition-all duration-200",
      hover && "hover:border-white/[0.14] hover:shadow-[0_4px_12px_rgba(0,0,0,0.5),0_8px_32px_rgba(0,0,0,0.4)] cursor-pointer",
      cardPadding[padding],
      className
    )}
  >
    {children}
  </div>
);

// ────────────────────────────────────────────────────────────
// STAT CARD — for dashboard metrics
// ────────────────────────────────────────────────────────────
interface StatCardProps {
  label:       string;
  value:       string | number;
  change?:     string;
  trend?:      "up" | "down" | "neutral";
  icon?:       React.ReactNode;
  accentColor?: "primary" | "secondary" | "tertiary";
}

const accentMap = {
  primary:   { icon: "bg-[#6366F1]/15 text-[#9899F5]", border: "border-[#6366F1]/20" },
  secondary: { icon: "bg-[#D946EF]/15 text-[#EFA8FB]", border: "border-[#D946EF]/20" },
  tertiary:  { icon: "bg-[#F59E0B]/15 text-[#FCD34D]", border: "border-[#F59E0B]/20" },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  trend = "neutral",
  icon,
  accentColor = "primary",
}) => {
  const accent = accentMap[accentColor];
  const trendColor = trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-white/40";

  return (
    <Card className={cn("border", accent.border)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-['Inter'] text-[0.75rem] text-white/50 mb-1">{label}</p>
          <p className="font-['Space_Grotesk'] text-[1.75rem] font-700 text-white leading-none">
            {value}
          </p>
          {change && (
            <p className={cn("font-['Inter'] text-[0.75rem] mt-1.5", trendColor)}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : ""} {change}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn("p-2.5 rounded-[10px] flex-shrink-0", accent.icon)}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};
