import Link from "next/link";

// Shown to accounts that haven't completed identity (KYC) verification yet
export default function NotVerifiedAlert() {
  return (
    <div
      role="status"
      className="flex w-full flex-wrap items-center gap-x-4 gap-y-3 rounded-box border border-bronze/30 bg-bronze/10 px-5 py-4"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-bronze" fill="none" aria-hidden="true">
        <path
          d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M12 8v4.5M12 15.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-marble">Verify your identity to start investing</p>
        <p className="mt-0.5 text-sm text-muted">
          Brokerage rules require us to confirm who you are before you can deposit money, trade or join a fund.
        </p>
      </div>
      <Link href="/account/settings/personal-information" className="btn btn-primary btn-sm">
        Verify identity
      </Link>
    </div>
  );
}
