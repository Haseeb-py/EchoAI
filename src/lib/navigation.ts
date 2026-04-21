import type { UserRole } from "@/lib/auth";

export const landingNavLinks = [
  { label: "LOGIN", href: "/login" },
  { label: "SIGNUP", href: "/signup" },
] as const;

export const protectedNavByRole: Record<UserRole, { label: string; href: string }[]> = {
  agent: [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Unauthorized", href: "/unauthorized" },
  ],
  supervisor: [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Supervisor", href: "/supervisor" },
    { label: "Unauthorized", href: "/unauthorized" },
  ],
  admin: [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Supervisor", href: "/supervisor" },
    { label: "Admin", href: "/admin" },
    { label: "Unauthorized", href: "/unauthorized" },
  ],
};
