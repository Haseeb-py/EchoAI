"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { AuthCard, AuthField, PasswordField } from "@/components/auth/AuthFormCard";
import { signupWithPassword, type UserRole } from "@/lib/auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupForm() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("agent");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Operator name must be at least 2 characters.");
      return;
    }

    if (!emailPattern.test(email)) {
      setError("Use a valid work email address to register.");
      return;
    }

    if (password.length < 8) {
      setError("Create a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match yet.");
      return;
    }

    try {
      setBusy(true);
      await signupWithPassword({
        name: name.trim(),
        email,
        password,
        role,
      });

      router.push(`/login?registered=1&email=${encodeURIComponent(email)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      badge="Provision Operator"
      title={
        <>
          Create Your
          <br />
          Clearance Profile
        </>
      }
      description="Provision a secure operator identity for EchoAI. Public registration defaults to the agent lane, while elevated roles stay subject to backend approval rules."
      aside={
        <>
          Already registered?{" "}
          <Link href="/login" className="text-[#cfd2ff] transition-colors hover:text-white">
            Return to login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <AuthCard
          title="Create Access"
          subtitle="Set up your workspace identity, choose the intended role, and prepare the account for backend verification."
          role={role}
          onRoleChange={setRole}
          error={error}
          busy={busy}
          ctaLabel="Create Secure Account"
          footer={
            <div className="space-y-4">
              <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[12px] leading-6 text-white/50">
                Elevated selections like supervisor and admin are preserved in the request, but your backend can still force public signup to the agent role until an admin approves it.
              </div>

              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-white/28">
                <span>JWT Ready</span>
                <span>RBAC Prepared</span>
                <span>Modular</span>
              </div>
            </div>
          }
        >
          <AuthField
            label="Operator Name"
            value={name}
            onChange={setName}
            placeholder="Ayesha Khan"
            autoComplete="name"
          />
          <AuthField
            label="Work Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="ayesha@echoai.com"
            autoComplete="email"
          />
          <PasswordField
            label="Security Key"
            value={password}
            onChange={setPassword}
            placeholder="Create a strong password"
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm Key"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm your password"
            autoComplete="new-password"
          />
        </AuthCard>
      </form>
    </AuthShell>
  );
}
