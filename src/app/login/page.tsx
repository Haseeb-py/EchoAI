import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login | EchoAI",
  description: "Secure operator login for EchoAI.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: {
    email?: string;
    registered?: string;
    next?: string;
  };
}) {
  return (
    <LoginForm
      initialEmail={searchParams?.email || ""}
      initialRegistered={searchParams?.registered === "1"}
      nextPath={searchParams?.next || ""}
    />
  );
}
