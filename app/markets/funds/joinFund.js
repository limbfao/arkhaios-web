"use client";

// Membership card on the public fund page: request to join, pending request,
// deposit (members, while recruiting) or a manager shortcut.

import Link from "next/link";
import { useState } from "react";
import { Panel } from "../../components/ui";
import { formatCurrency, formatDate, formatPercent } from "../../lib/format";
import { postJSON, termInfo } from "../../funds-home/fundKit";
import FundDeposit from "./fundDeposit";

export default function JoinFund({ fund, status: initialStatus, contributions: initialContributions, totalContributed }) {
  const [status, setStatus] = useState(initialStatus); // "none" | "requested" | "member" | "manager"
  const [contributions, setContributions] = useState(initialContributions || []);
  const term = termInfo(fund);

  if (status === "manager") {
    return (
      <Panel title="You manage this fund">
        <p className="text-sm text-muted">Review requests, post updates and trade for the fund from your console.</p>
        <div className="mt-4 flex gap-2">
          <Link href="/dashboard" className="btn btn-primary btn-sm">Open console</Link>
          <Link href="/funds-home" className="btn btn-ghost btn-sm border border-line">Fund settings</Link>
        </div>
      </Panel>
    );
  }

  if (status === "member") {
    const mine = contributions.reduce((n, c) => n + (parseFloat(c.amount) || 0), 0);
    const pool = (totalContributed || 0) + (mine - (initialContributions || []).reduce((n, c) => n + (parseFloat(c.amount) || 0), 0));
    return (
      <Panel title="Your investment">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm text-muted">Contributed</div>
            <div className="stat-value mt-0.5 text-3xl font-semibold text-marble">{formatCurrency(mine)}</div>
          </div>
          {pool ? (
            <div className="text-right">
              <div className="text-sm text-muted">Share of fund</div>
              <div className="tabular mt-0.5 text-marble">{formatPercent(mine / pool, { signed: false, digits: 1 })}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 border-t border-line pt-5">
          {term.stage === "recruiting" ? (
            <FundDeposit fundID={fund.fundID} fundName={fund.fundName}
              onDeposited={(c) => setContributions((list) => [c, ...list])} />
          ) : (
            <p className="text-sm text-muted">
              Deposits are closed while the fund is trading. This term ends {term.end ? formatDate(term.end, { time: false }) : "soon"}.
            </p>
          )}
        </div>

        {contributions.length ? (
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="mb-2 text-sm font-medium text-marble">Deposits</h3>
            <ul className="space-y-2 text-sm">
              {contributions.map((c, i) => (
                <li key={c.journalID || i} className="flex justify-between gap-3">
                  <span className="text-muted">{formatDate(c.time, { time: false })}</span>
                  <span className="tabular text-marble">{formatCurrency(c.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>
    );
  }

  if (status === "requested") {
    return (
      <Panel title="Request sent">
        <p className="text-sm text-muted">
          Your request to join {fund.fundName} is waiting for the portfolio manager. You&apos;ll get a notification
          when they respond{term.stage === "recruiting" ? ", and can deposit as soon as you're accepted" : ""}.
        </p>
      </Panel>
    );
  }

  return <RequestForm fund={fund} recruiting={term.stage === "recruiting"} onSent={() => setStatus("requested")} />;
}

function RequestForm({ fund, recruiting, onSent }) {
  const [inquiry, setInquiry] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isPrivate = !fund.publiclyAvailable;

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (isPrivate && !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit access code from the portfolio manager.");
      return;
    }
    setBusy(true);
    const result = await postJSON("/api/fund/join", {
      type: "request", fundID: fund.fundID, inquiry: inquiry.trim(), accessCode: code,
    });
    setBusy(false);
    if (result.ok) onSent();
    else setError(result.message || "The request couldn't be sent.");
  }

  return (
    <Panel title={`Join ${fund.fundSymbol}`}>
      <p className="mb-4 text-sm text-muted">
        {recruiting
          ? "The fund is recruiting. Once the manager accepts you, you can deposit until recruiting ends."
          : "The fund is trading this term. Request now and you can deposit when the next recruiting window opens."}
      </p>
      <form onSubmit={submit} className="space-y-3" noValidate>
        {isPrivate ? (
          <div>
            <label htmlFor="access-code" className="field-label">Access code</label>
            <input id="access-code" className="field tabular tracking-[0.3em]" inputMode="numeric" maxLength={6}
              placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </div>
        ) : null}
        <div>
          <label htmlFor="join-inquiry" className="field-label">Message to the manager <span className="text-muted/70">(optional)</span></label>
          <textarea id="join-inquiry" className="field min-h-[88px] resize-y" maxLength={500} value={inquiry}
            onChange={(e) => setInquiry(e.target.value)} placeholder="Introduce yourself and why you'd like to join." />
        </div>
        {error ? <p className="text-sm text-loss" role="alert">{error}</p> : null}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? <span className="loading loading-spinner loading-xs" /> : null}
          Request to join
        </button>
      </form>
    </Panel>
  );
}
