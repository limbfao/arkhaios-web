"use client";

// Deposit form for members while a fund is recruiting. Moves cash from the member's
// brokerage account into the fund (POST /api/fund/invest).

import { useState } from "react";
import useFetch from "../../hooks/useFetch";
import { Skeleton } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import { postJSON } from "../../funds-home/fundKit";

const PRESETS = [500, 1000, 5000];

export default function FundDeposit({ fundID, fundName, onDeposited }) {
  const trading = useFetch("/api/account/trading");
  const buyingPower = parseFloat(trading.responseJSON?.data?.buying_power);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  const value = parseFloat(amount);
  let problem = "";
  if (!(value >= 1)) problem = "Enter an amount of at least $1.00.";
  else if (Number.isFinite(buyingPower) && value > buyingPower) problem = `You have ${formatCurrency(buyingPower)} available to deposit.`;

  async function submit(event) {
    event.preventDefault();
    setTouched(true);
    setError("");
    if (problem) return;
    setBusy(true);
    const result = await postJSON("/api/fund/invest", { fundID, amount: value.toFixed(2) });
    setBusy(false);
    if (result.ok) {
      setDone(result.data);
      setAmount("");
      setTouched(false);
      trading.reload();
      onDeposited?.(result.data);
    } else {
      setError(result.message || "The deposit couldn't be started. Try again.");
    }
  }

  if (done) {
    return (
      <div className="rounded-box border border-gain/30 bg-gain/10 p-4" role="status">
        <p className="text-sm font-medium text-marble">Deposit of {formatCurrency(done.amount)} initiated</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          The money is moving from your brokerage account into {fundName}. It counts toward your share of the fund
          once the transfer settles.
        </p>
        <button type="button" className="mt-3 text-xs text-bronze hover:underline" onClick={() => setDone(null)}>
          Make another deposit
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="deposit-amount" className="field-label">Deposit amount</label>
          <span className="mb-1.5 text-xs text-muted">
            {trading.isLoading ? <Skeleton className="h-3 w-24" /> : Number.isFinite(buyingPower) ? `${formatCurrency(buyingPower)} available` : ""}
          </span>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
          <input id="deposit-amount" className={`field tabular pl-7 text-right ${touched && problem ? "border-loss" : ""}`}
            inputMode="decimal" placeholder="0.00" value={amount}
            aria-invalid={Boolean(touched && problem)} aria-describedby="deposit-msg"
            onChange={(e) => {
              const clean = e.target.value.replace(/[^0-9.]/g, "");
              const [whole, ...rest] = clean.split(".");
              setAmount(rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole);
            }} />
        </div>
        <div className="mt-2 flex gap-2">
          {PRESETS.map((p) => (
            <button key={p} type="button" className="btn btn-ghost btn-xs border border-line"
              onClick={() => setAmount(String(p))}>
              {formatCurrency(p, { compact: true })}
            </button>
          ))}
        </div>
      </div>
      <p id="deposit-msg" className="min-h-[1rem] text-xs text-loss" role="alert">{(touched && problem) || error}</p>
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? <span className="loading loading-spinner loading-xs" /> : null}
        {value >= 1 ? `Deposit ${formatCurrency(value)}` : "Deposit"}
      </button>
      <p className="text-xs leading-relaxed text-muted">
        Deposits are locked in the fund for its terms and come back to you, with your share of profits, at distribution.
      </p>
    </form>
  );
}
