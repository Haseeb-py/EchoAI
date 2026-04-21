import type { Metadata } from "next";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Signup | EchoAI",
  description: "Create a new EchoAI account.",
};

export default function SignupPage() {
  return <SignupForm />;
}
