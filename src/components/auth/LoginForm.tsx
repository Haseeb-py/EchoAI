"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { AuthCard, AuthField, PasswordField } from "@/components/auth/AuthFormCard";
import {
  canAccessPath,
  clearAuthSession,
  decodeRoleFromToken,
  getDefaultRouteForRole,
  getStoredAuthToken,
  isTokenExpired,
  loginWithPassword,
  persistAuthSession,
  type UserRole,
} from "@/lib/auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm({
  initialEmail = "",
  initialRegistered = false,
  nextPath = "",
}: {
  initialEmail?: string;
  initialRegistered?: boolean;
  nextPath?: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("agent");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getStoredAuthToken();

    if (!token || isTokenExpired(token)) {
      if (token) {
        clearAuthSession();
      }

      return;
    }

    const roleFromToken = decodeRoleFromToken(token);

    if (roleFromToken) {
      setRole(roleFromToken);
      const destination =
        nextPath && canAccessPath(nextPath, roleFromToken)
          ? nextPath
          : getDefaultRouteForRole(roleFromToken);

      router.replace(destination);
    }
  }, [nextPath, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!emailPattern.test(email)) {
      setError("Use a valid work email address to continue.");
      return;
    }

    if (password.length < 8) {
      setError("Security key must be at least 8 characters.");
      return;
    }

    try {
      setBusy(true);
      const response = await loginWithPassword({ email, password }, role);
      persistAuthSession(response.token, response.user);

      const destination =
        nextPath && canAccessPath(nextPath, response.user.role)
          ? nextPath
          : getDefaultRouteForRole(response.user.role);

      router.push(destination);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to initialize session.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      badge="Initialize Session"
      title={
        <>
          EchoAI:
          <br />
          Secure Access
        </>
      }
      description="Enter the high-fidelity ecosystem of digital intelligence. Authenticate to manage your voice personas, sales leads, and operational lanes."
      aside={
        <>
          New operator?{" "}
          <Link href="/signup" className="text-[#cfd2ff] transition-colors hover:text-white">
            Create a secure account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <AuthCard
          title="Initialize Session"
          subtitle="Select your operational clearance level, verify your credentials, and enter the platform."
          role={role}
          onRoleChange={setRole}
          error={error}
          busy={busy}
          ctaLabel="Authorize Entry"
          footer={
            <div className="space-y-4">
              {initialRegistered ? (
                <div className="rounded-[14px] border border-[#96c6a6]/20 bg-[#183123]/45 px-4 py-3 text-[13px] text-[#c9f1d4]">
                  Account created. Sign in to continue into EchoAI.
                </div>
              ) : null}

              <div className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-white/28">
                Session Protocols
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[12px] font-medium text-white/62 transition-colors hover:text-white/82"
                >
                  Vault
                </button>
                <button
                  type="button"
                  className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[12px] font-medium text-white/62 transition-colors hover:text-white/82"
                >
                  Biometrics
                </button>
              </div>
            </div>
          }
        >
          <AuthField
            label="Work Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="name@echoai.com"
            autoComplete="email"
          />
          <PasswordField
            label="Security Key"
            value={password}
            onChange={setPassword}
            placeholder="Enter your password"
            trailingLabel="Recover"
            autoComplete="current-password"
          />
        </AuthCard>
      </form>
    </AuthShell>
  );
}
