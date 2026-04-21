import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand palette from Stitch ──────────────────────────
        primary: {
          DEFAULT: "#6366F1",
          50:  "#EEEEFF",
          100: "#DCDCFE",
          200: "#BABABD",
          300: "#9899F5",
          400: "#7577F3",
          500: "#6366F1", // ← base
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
          500: "#D946EF", // ← base
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
          500: "#F59E0B", // ← base
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
          950: "#0B0C10", // ← base background
        },
        // ── Semantic aliases ───────────────────────────────────
        surface: {
          DEFAULT: "#141418",  // card background
          raised: "#1C1C22",   // elevated surface
          overlay: "#22222A",  // modals / overlays
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.08)",
          strong: "rgba(255,255,255,0.14)",
        },
      },

      fontFamily: {
        headline: ["Space Grotesk", "sans-serif"],
        body:     ["Inter", "sans-serif"],
        // utility alias
        sans:     ["Inter", "sans-serif"],
        display:  ["Space Grotesk", "sans-serif"],
      },

      fontSize: {
        // Stitch label scale
        "label-sm":  ["0.75rem",  { lineHeight: "1rem",    letterSpacing: "0.01em" }],
        "label-md":  ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.005em" }],
        "label-lg":  ["1rem",     { lineHeight: "1.5rem",  letterSpacing: "0em" }],
        // Body scale
        "body-sm":   ["0.875rem", { lineHeight: "1.4rem" }],
        "body-md":   ["1rem",     { lineHeight: "1.6rem" }],
        "body-lg":   ["1.125rem", { lineHeight: "1.75rem" }],
        // Headline scale
        "h1": ["3rem",    { lineHeight: "1.1", fontWeight: "700", letterSpacing: "-0.02em" }],
        "h2": ["2.25rem", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.015em" }],
        "h3": ["1.875rem",{ lineHeight: "1.2",  fontWeight: "600", letterSpacing: "-0.01em" }],
        "h4": ["1.5rem",  { lineHeight: "1.25", fontWeight: "600" }],
        "h5": ["1.25rem", { lineHeight: "1.3",  fontWeight: "500" }],
        "h6": ["1.125rem",{ lineHeight: "1.4",  fontWeight: "500" }],
      },

      borderRadius: {
        "card":   "16px",
        "button": "8px",
        "badge":  "6px",
        "pill":   "9999px",
      },

      boxShadow: {
        "card":    "0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.4)",
        "primary": "0 0 20px rgba(99,102,241,0.35)",
        "secondary":"0 0 20px rgba(217,70,239,0.35)",
        "tertiary": "0 0 20px rgba(245,158,11,0.35)",
        "glow-sm": "0 0 8px rgba(99,102,241,0.4)",
      },

      backgroundImage: {
        // Gradient helpers matching the palette
        "gradient-primary":   "linear-gradient(135deg, #6366F1 0%, #4F52D4 100%)",
        "gradient-secondary": "linear-gradient(135deg, #D946EF 0%, #C026D3 100%)",
        "gradient-tertiary":  "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
        "gradient-mesh":
          "radial-gradient(at 20% 30%, rgba(99,102,241,0.15) 0px, transparent 50%), radial-gradient(at 80% 70%, rgba(217,70,239,0.1) 0px, transparent 50%)",
      },

      animation: {
        "fade-in":      "fadeIn 0.3s ease-out both",
        "slide-up":     "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "slide-in":     "slideIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-glow":   "pulseGlow 2s ease-in-out infinite",
        "spin-slow":    "spin 3s linear infinite",
        "bounce-subtle":"bounceSub 1.5s ease-in-out infinite",
      },

      keyframes: {
        fadeIn:    { from: { opacity: "0" },                         to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideIn:   { from: { opacity: "0", transform: "translateX(-12px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(99,102,241,0.3)" },
          "50%":       { boxShadow: "0 0 20px rgba(99,102,241,0.6)" },
        },
        bounceSub: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":       { transform: "translateY(-4px)" },
        },
      },

      transitionTimingFunction: {
        "spring":   "cubic-bezier(0.16, 1, 0.3, 1)",
        "snappy":   "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      spacing: {
        // Component-specific spacing tokens
        "sidebar":  "260px",
        "topbar":   "64px",
        "panel":    "360px",
      },
    },
  },
  plugins: [],
};

export default config;
