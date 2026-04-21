/**
 * Button.tsx
 * Matches all 4 button variants from the Stitch design:
 * Primary · Secondary · Inverted · Outlined
 * Plus ghost + icon variants.
 */

import React from "react";
import { cn } from "@/lib/utils"; // or: import clsx from 'clsx'

// ── Types ──────────────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "inverted" | "outlined" | "ghost";
type ButtonSize    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?:   boolean;
  fullWidth?: boolean;
}

// ── Variant styles ─────────────────────────────────────────────────────────────
const variantClasses: Record<ButtonVariant, string> = {
  primary:   "bg-[#6366F1] text-white hover:bg-[#4F52D4] active:bg-[#3B3EB7] hover:shadow-[0_0_20px_rgba(99,102,241,0.35)]",
  secondary: "bg-[#D946EF] text-white hover:bg-[#C026D3] active:bg-[#A21CAF] hover:shadow-[0_0_20px_rgba(217,70,239,0.35)]",
  inverted:  "bg-white text-[#0B0C10] hover:bg-gray-100 active:bg-gray-200",
  outlined:  "bg-transparent text-white border border-white/20 hover:bg-white/5 hover:border-white/30",
  ghost:     "bg-transparent text-white/70 hover:bg-white/5 hover:text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[0.8125rem] gap-1.5 rounded-[6px]",
  md: "px-4  py-2   text-[0.875rem]  gap-2   rounded-[8px]",
  lg: "px-5  py-2.5 text-[1rem]      gap-2.5 rounded-[10px]",
};

// ── Component ──────────────────────────────────────────────────────────────────
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant  = "primary",
      size     = "md",
      leftIcon,
      rightIcon,
      loading  = false,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // base
          "inline-flex items-center justify-center font-['Inter'] font-medium",
          "transition-all duration-200 select-none cursor-pointer",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
          "active:scale-[0.98]",
          // variant & size
          variantClasses[variant],
          sizeClasses[size],
          // full width
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <LoadingSpinner size={size} />
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

// ── Icon Button ────────────────────────────────────────────────────────────────
type IconButtonColor = "primary" | "secondary" | "tertiary" | "neutral";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?:   IconButtonColor;
  size?:    "sm" | "md" | "lg";
  tooltip?: string;
}

const iconBtnColors: Record<IconButtonColor, string> = {
  primary:   "bg-[#6366F1]/15 text-[#9899F5] hover:bg-[#6366F1]/25",
  secondary: "bg-[#D946EF]/15 text-[#EFA8FB] hover:bg-[#D946EF]/25",
  tertiary:  "bg-[#F59E0B]/15 text-[#FCD34D] hover:bg-[#F59E0B]/25",
  neutral:   "bg-white/8     text-white/60   hover:bg-white/12 hover:text-white/80",
};

const iconBtnSizes: Record<string, string> = {
  sm: "p-1.5 rounded-[6px]",
  md: "p-2   rounded-[8px]",
  lg: "p-2.5 rounded-[10px]",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ color = "neutral", size = "md", children, className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center",
        "transition-all duration-200 cursor-pointer",
        "active:scale-[0.95]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        iconBtnColors[color],
        iconBtnSizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

IconButton.displayName = "IconButton";

// ── Button Group ───────────────────────────────────────────────────────────────
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className }) => (
  <div
    className={cn(
      "inline-flex items-center divide-x divide-white/10",
      "border border-white/10 rounded-[8px] overflow-hidden",
      className
    )}
  >
    {children}
  </div>
);

// ── Loading Spinner ────────────────────────────────────────────────────────────
const spinnerSize: Record<ButtonSize, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4   h-4",
  lg: "w-5   h-5",
};

const LoadingSpinner: React.FC<{ size: ButtonSize }> = ({ size }) => (
  <svg
    className={cn("animate-spin", spinnerSize[size])}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12" cy="12" r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

// ── Usage example (for Storybook / dev reference) ──────────────────────────────
// export const ButtonDemo = () => (
//   <div className="flex flex-wrap gap-3 p-6 bg-[#0B0C10]">
//     <Button variant="primary">Primary</Button>
//     <Button variant="secondary">Secondary</Button>
//     <Button variant="inverted">Inverted</Button>
//     <Button variant="outlined">Outlined</Button>
//     <Button variant="ghost">Ghost</Button>
//     <Button variant="primary" loading>Loading</Button>
//     <Button variant="primary" disabled>Disabled</Button>
//   </div>
// );
