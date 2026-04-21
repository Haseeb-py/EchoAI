import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#070913] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[960px] items-center justify-center">
        <div className="w-full max-w-[620px] rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(22,24,34,0.98),rgba(13,14,20,0.98))] p-8 text-center shadow-[0_30px_80px_rgba(4,5,10,0.55)]">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[18px] border border-[#ffb0b0]/16 bg-[#472632]/40 text-[#ffd8db]">
            <ShieldAlert size={28} strokeWidth={2.1} aria-hidden="true" />
          </div>

          <h1 className="mt-6 font-headline text-[42px] font-semibold tracking-[-0.03em] text-white">
            Clearance Mismatch
          </h1>
          <p className="mx-auto mt-4 max-w-[480px] text-[16px] leading-7 text-white/56">
            Your current session does not have permission for this route. Authenticate with the correct role, or return to an allowed workspace.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-[12px] bg-[#b9b7ff] px-5 text-[13px] font-semibold tracking-[0.06em] text-[#252a4d] transition-colors hover:bg-[#cbcafc]"
            >
              Reauthenticate
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-[12px] border border-white/10 bg-white/[0.03] px-5 text-[13px] font-semibold tracking-[0.06em] text-white/82 transition-colors hover:bg-white/[0.06]"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
