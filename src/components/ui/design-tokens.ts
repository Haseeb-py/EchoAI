/**
 * design-tokens.ts
 * Single source of truth for all design tokens.
 * Extracted directly from Stitch design file.
 * Use these in component logic, animations, and dynamic styles.
 */

// ── Brand Colors ───────────────────────────────────────────────────────────────
export const colors = {
  primary: {
    DEFAULT: "#6366F1",
    50:  "#EEEEFF",
    100: "#DCDCFE",
    200: "#BABABD",
    300: "#9899F5",
    400: "#7577F3",
    500: "#6366F1",
    600: "#4F52D4",
    700: "#3B3EB7",
    800: "#272A9A",
    900: "#13177D",
    950: "#0A0C3E",
  },
  secondary: {
    DEFAULT: "#D946EF",
    50:  "#FDF4FF",
    100: "#FAE8FF",
    200: "#F5D0FE",
    300: "#EFA8FB",
    400: "#E472F7",
    500: "#D946EF",
    600: "#C026D3",
    700: "#A21CAF",
    800: "#86198F",
    900: "#701A75",
    950: "#4A044E",
  },
  tertiary: {
    DEFAULT: "#F59E0B",
    50:  "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
    800: "#92400E",
    900: "#78350F",
    950: "#451A03",
  },
  neutral: {
    DEFAULT: "#0B0C10",
    50:  "#F8F8F8",
    100: "#E8E8E8",
    200: "#C8C8C8",
    300: "#A8A8A8",
    400: "#787878",
    500: "#585858",
    600: "#383838",
    700: "#282828",
    800: "#1A1A1A",
    900: "#111114",
    950: "#0B0C10",
  },
} as const;

// ── Surface / Background tokens ────────────────────────────────────────────────
export const surfaces = {
  base:    "#0B0C10",  // page background
  card:    "#141418",  // default card
  raised:  "#1C1C22",  // elevated card / sidebar
  overlay: "#22222A",  // modal / dropdown
} as const;

// ── Typography ─────────────────────────────────────────────────────────────────
export const fonts = {
  headline: "'Space Grotesk', sans-serif",
  body:     "'Inter', sans-serif",
} as const;

export const fontWeights = {
  light:    300,
  regular:  400,
  medium:   500,
  semibold: 600,
  bold:     700,
} as const;

// ── Border radius ──────────────────────────────────────────────────────────────
export const radius = {
  card:   "16px",
  button: "8px",
  badge:  "6px",
  pill:   "9999px",
} as const;

// ── Spacing ────────────────────────────────────────────────────────────────────
export const spacing = {
  sidebar: "260px",
  topbar:  "64px",
  panel:   "360px",
} as const;

// ── Status colors (for agent/call states) ──────────────────────────────────────
export const statusColors = {
  online:    { bg: "#16A34A", glow: "rgba(22,163,74,0.4)",  label: "Online" },
  busy:      { bg: "#DC2626", glow: "rgba(220,38,38,0.4)",  label: "Busy" },
  away:      { bg: "#CA8A04", glow: "rgba(202,138,4,0.35)", label: "Away" },
  offline:   { bg: "#374151", glow: "transparent",          label: "Offline" },
  onCall:    { bg: "#6366F1", glow: "rgba(99,102,241,0.4)", label: "On Call" },
  wrapping:  { bg: "#D946EF", glow: "rgba(217,70,239,0.4)", label: "Wrapping" },
} as const;

export type AgentStatus = keyof typeof statusColors;

// ── Button variant map ─────────────────────────────────────────────────────────
export const buttonVariants = {
  primary:   "btn-primary",
  secondary: "btn-secondary",
  inverted:  "btn-inverted",
  outlined:  "btn-outlined",
  ghost:     "btn-ghost",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

// ── Gradient presets ───────────────────────────────────────────────────────────
export const gradients = {
  primary:   "linear-gradient(135deg, #6366F1 0%, #4F52D4 100%)",
  secondary: "linear-gradient(135deg, #D946EF 0%, #C026D3 100%)",
  tertiary:  "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
  hero:      "linear-gradient(135deg, #6366F1 0%, #D946EF 100%)",
} as const;

// ── Animation durations ────────────────────────────────────────────────────────
export const durations = {
  fast:    "150ms",
  normal:  "250ms",
  slow:    "400ms",
  spring:  "500ms",
} as const;

export const easings = {
  spring: "cubic-bezier(0.16, 1, 0.3, 1)",
  snappy: "cubic-bezier(0.4, 0, 0.2, 1)",
  bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

// ── Shadow presets ─────────────────────────────────────────────────────────────
export const shadows = {
  card:      "0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)",
  cardHover: "0 4px 12px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.4)",
  primary:   "0 0 20px rgba(99,102,241,0.35)",
  secondary: "0 0 20px rgba(217,70,239,0.35)",
  tertiary:  "0 0 20px rgba(245,158,11,0.35)",
} as const;

// ── Complete token export ──────────────────────────────────────────────────────
export const tokens = {
  colors,
  surfaces,
  fonts,
  fontWeights,
  radius,
  spacing,
  statusColors,
  gradients,
  durations,
  easings,
  shadows,
} as const;

export default tokens;
