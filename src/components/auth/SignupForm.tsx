"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { AuthCard, AuthField, PasswordField } from "@/components/auth/AuthFormCard";
import { signupWithPassword } from "@/lib/auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }

    if (companyName.trim().length < 2) {
      setError("Company name must be at least 2 characters.");
      return;
    }

    if (companyDescription.trim().length < 10) {
      setError("Company description must be at least 10 characters.");
      return;
    }

    if (!emailPattern.test(email)) {
      setError("Use a valid work email address to register.");
      return;
    }

    if (phoneNumber.trim().length < 7) {
      setError("Enter a valid phone number.");
      return;
    }

    if (country.trim().length < 2) {
      setError("Country or region is required.");
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
        companyName: companyName.trim(),
        companyDescription: companyDescription.trim(),
        email,
        phoneNumber: phoneNumber.trim(),
        country: country.trim(),
        password,
        role: "admin",
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
      badge="Create Organization"
      title={
        <>
          Launch Your
          <br />
          EchoAI Workspace
        </>
      }
      description="Create your company workspace in EchoAI. This signup is designed for the BPO owner or organization administrator who will configure campaigns, teams, and system settings."
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
          title="Create Organization"
          subtitle="Set up the company account first. This creates the main organization workspace and the primary admin who will manage the rest of the team."
          role="admin"
          onRoleChange={() => {}}
          showRoleSelector={false}
          error={error}
          busy={busy}
          ctaLabel="Create Organization Account"
          footer={
            <div className="space-y-4">
              <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[12px] leading-6 text-white/50">
                This signup creates the organization workspace and its primary admin. Agent and supervisor accounts should be invited or created later from inside the platform.
              </div>

              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-white/28">
                <span>Organization First</span>
                <span>Admin Owner</span>
                <span>Workspace Ready</span>
              </div>
            </div>
          }
        >
          <AuthField
            label="Organization / Company Name"
            value={companyName}
            onChange={setCompanyName}
            placeholder="Echo BPO Solutions"
            autoComplete="organization"
          />
          <AuthField
            label="Organization Description"
            value={companyDescription}
            onChange={setCompanyDescription}
            placeholder="Outbound sales and support company serving telecom and SaaS campaigns."
            autoComplete="organization-title"
          />
          <AuthField
            label="Business Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="ops@echobpo.com"
            autoComplete="email"
          />
          <AuthField
            label="Business Phone"
            value={phoneNumber}
            onChange={setPhoneNumber}
            placeholder="+92 300 1234567"
            autoComplete="tel"
          />
          <AuthField
            label="Country / Region"
            value={country}
            onChange={setCountry}
            placeholder="Pakistan"
            autoComplete="country-name"
          />
          <AuthField
            label="Primary Admin Name"
            value={name}
            onChange={setName}
            placeholder="Ayesha Khan"
            autoComplete="name"
          />
          <PasswordField
            label="Admin Password"
            value={password}
            onChange={setPassword}
            placeholder="Create a strong admin password"
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm Password"
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
