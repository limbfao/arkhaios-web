"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Spinner, fetchJSON } from "../accountUi";
import { BankMark } from "./bankMark";
import { formatCurrency } from "../../lib/format";

const QUICK_AMOUNTS = [100, 500, 1000, 5000];
const MAX_DEPOSIT = 50000;

function bankKey(bank) {
  return bank.key || `${bank.institution_id || bank.institution_name}-${bank.mask}`;
}

// Deposit to or withdraw from the brokerage account over ACH
export default function TransferModal({ open, initialDirection = "incoming", banks, cash, onClose, onDone }) {
  const dialog = useRef(null);
  const [direction, setDirection] = useState(initialDirection);
  const [bank, setBank] = useState(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      setDirection(initialDirection);
      setBank(banks[0] ? bankKey(banks[0]) : null);
      setAmount(""); setError("");
      el.showModal();
    } else if (!open && el.open) el.close();
  }, [open, initialDirection, banks]);

  const value = parseFloat(amount);
  const deposit = direction === "incoming";
  const limit = deposit ? MAX_DEPOSIT : parseFloat(cash) || 0;
  const problem = useMemo(() => {
    if (!amount) return "";
    if (!Number.isFinite(value) || value <= 0) return "Enter an amount greater than $0.";
    if (value > limit) return deposit
      ? `Deposits are limited to ${formatCurrency(MAX_DEPOSIT)} per transfer.`
      : `You can withdraw up to ${formatCurrency(limit)}.`;
    return "";
  }, [amount, value, limit, deposit]);
  const selected = banks.find((b) => bankKey(b) === bank);
  const canSubmit = selected && amount && !problem && !submitting;

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true); setError("");
    try {
      const { data } = await fetchJSON("/api/account/ach-transfer", {
        method: "POST",
        body: {
          institution: selected.institution_id || selected.institution_name,
          type: selected.subtype,
          amount: value.toFixed(2),
          direction,
        },
      });
      onDone(data, `${deposit ? "Deposit" : "Withdrawal"} of ${formatCurrency(value)} started`);
    } catch (err) {
      setError(err.data?.message ? `The transfer couldn't be started: ${err.data.message}.` : "The transfer couldn't be started. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog ref={dialog} className="modal" onClose={onClose} aria-labelledby="transfer-title">
      <form onSubmit={submit} className="modal-box max-w-md border border-line bg-stone p-0">
        <div className="border-b border-line px-6 py-5">
          <h2 id="transfer-title" className="text-lg font-semibold text-marble">Transfer money</h2>
          <p className="mt-1 text-sm text-muted">ACH transfers usually settle in 1 to 3 business days.</p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="join w-full" role="group" aria-label="Direction">
            {[["incoming", "Deposit"], ["outgoing", "Withdraw"]].map(([dir, label]) => (
              <button
                key={dir}
                type="button"
                aria-pressed={direction === dir}
                onClick={() => setDirection(dir)}
                className={`btn join-item btn-sm flex-1 ${direction === dir ? "btn-active border-bronze/60 text-marble" : "btn-ghost border-line text-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <fieldset>
            <legend className="field-label">{deposit ? "From" : "To"}</legend>
            <div className="space-y-2">
              {banks.map((b) => (
                <label
                  key={bankKey(b)}
                  className={`flex cursor-pointer items-center gap-3 rounded-btn border px-3.5 py-2.5 transition-colors ${
                    bank === bankKey(b) ? "border-bronze bg-bronze/10" : "border-line hover:bg-slate"
                  }`}
                >
                  <input type="radio" name="bank" className="radio radio-primary radio-sm"
                    checked={bank === bankKey(b)} onChange={() => setBank(bankKey(b))} />
                  <BankMark name={b.institution_name} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-marble">{b.institution_name} {b.name}</span>
                    <span className="block text-xs text-muted">{b.subtype === "savings" ? "Savings" : "Checking"} ending in {b.mask}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="transfer-amount" className="field-label">Amount</label>
              {!deposit ? <span className="text-xs text-muted">Available {formatCurrency(cash)}</span> : null}
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
              <input
                id="transfer-amount"
                className="field tabular pl-7 text-base"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                aria-invalid={Boolean(problem)}
                aria-describedby="transfer-amount-help"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((n) => (
                <button key={n} type="button" className="btn btn-xs btn-ghost border border-line font-normal text-muted"
                  onClick={() => setAmount(String(n))}>
                  {formatCurrency(n).replace(".00", "")}
                </button>
              ))}
            </div>
            <p id="transfer-amount-help" className={`mt-2 min-h-[1.25rem] text-xs ${problem ? "text-loss" : "text-muted"}`}>
              {problem || (deposit ? "Deposits are available to trade right away." : "Only settled cash can be withdrawn.")}
            </p>
          </div>

          {error ? <p className="text-sm text-loss" role="alert">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm min-w-[9rem]" disabled={!canSubmit}>
            {submitting ? <Spinner /> : null}
            {deposit ? "Deposit" : "Withdraw"} {value > 0 && !problem ? formatCurrency(value) : ""}
          </button>
        </div>
      </form>
      <form method="dialog" className="modal-backdrop"><button aria-label="Close">close</button></form>
    </dialog>
  );
}
