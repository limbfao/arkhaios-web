import CreateFund from "./CreateFund";

// Page wrapper around the create-fund form for users without a fund
export default function CreateFundPage() {
  return (
    <div className="page">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="page-title">Start a fund</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Pool capital with friends and manage it as one portfolio. Members deposit while the fund is
            recruiting, you trade on their behalf, and profits are distributed at the end of each term.
          </p>
        </div>
        <ol className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            ["Recruit", "Members request to join and deposit cash during the 14-day recruiting window."],
            ["Trade", "Place limit orders on behalf of the fund using its pooled cash."],
            ["Distribute", "At each term's end, profits are shared out after your fees."],
          ].map(([title, text], i) => (
            <li key={title} className="rounded-box border border-line p-4">
              <div className="text-xs text-bronze">Step {i + 1}</div>
              <div className="mt-1 text-sm font-medium text-marble">{title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
        <CreateFund />
      </div>
    </div>
  );
}
