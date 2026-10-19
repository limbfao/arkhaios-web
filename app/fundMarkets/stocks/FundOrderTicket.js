"use client";

// Order ticket for trading on behalf of a fund: limit orders in whole or fractional
// shares, buys paid from the fund's available cash.

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCurrency, formatNumber } from "../../lib/format";
import { postJSON } from "../../funds-home/fundKit";

const decimal = (value, places) => {
  const clean = value.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = clean.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, places)}` : whole;
};

export default function FundOrderTicket({ fund, symbol, price, cash, heldShares, onPlaced }) {
  const [side, setSide] = useState("buy");
  const [shares, setShares] = useState("");
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(null);
  const [touched, setTouched] = useState(false);

  // Start the limit at the current price once it is known
  useEffect(() => {
    if (Number.isFinite(price) && !limit) setLimit(price.toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price]);

  const qty = parseFloat(shares);
  const limitPrice = parseFloat(limit);
  const total = qty > 0 && limitPrice > 0 ? qty * limitPrice : 0;
  const cashAfter = cash - total;

  let problem = "";
  if (!(qty > 0)) problem = "Enter the number of shares.";
  else if (!(limitPrice > 0)) problem = "Enter a limit price.";
  else if (side === "buy" && total > cash) problem = `This order costs ${formatCurrency(total - cash)} more than the fund's available cash.`;
  else if (side === "sell" && qty > heldShares) {
    problem = heldShares ? `The fund holds ${formatNumber(heldShares)} shares of ${symbol}.` : `The fund doesn't hold ${symbol}.`;
  }

  const farFromMarket = Number.isFinite(price) && limitPrice > 0 && Math.abs(limitPrice / price - 1) > 0.1;

  async function submit(event) {
    event.preventDefault();
    setTouched(true);
    setError("");
    if (problem) return;
    setBusy(true);
    const result = await postJSON("/api/place-order", {
      fund: fund.fundID,
      symbol,
      side,
      type: "limit",
      transaction: "shares",
      qty: String(qty),
      price: limitPrice.toFixed(2),
    });
    setBusy(false);
    if (result.ok) {
      setPlaced({ side, qty, limitPrice, status: result.data?.status });
      setShares("");
      setTouched(false);
      onPlaced?.();
    } else {
      setError(result.message || "The order couldn't be placed.");
    }
  }

  return (
    <section className="panel" aria-label="Fund order ticket">
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="panel-title">Trade {symbol} for the fund</h2>
          <span className="rounded-md border border-bronze/40 bg-bronze/10 px-2 py-0.5 text-xs text-bronze">Limit only</span>
        </div>
        <p className="mt-1 text-xs text-muted">Placing orders for {fund.fundName} ({fund.fundSymbol}), not your personal account.</p>
      </div>

      <form onSubmit={submit} className="space-y-4 p-5" noValidate>
        <div role="tablist" aria-label="Order side" className="grid grid-cols-2 rounded-btn border border-line bg-basalt p-0.5">
          {["buy", "sell"].map((s) => (
            <button key={s} type="button" role="tab" aria-selected={side === s}
              onClick={() => { setSide(s); setPlaced(null); setError(""); }}
              className={`rounded-[0.4rem] py-1.5 text-sm font-medium capitalize transition-colors ${
                side === s ? (s === "buy" ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss") : "text-muted hover:text-marble"
              }`}>
              {s}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="fund-shares" className="field-label">Shares</label>
          <input id="fund-shares" className="field tabular text-right" inputMode="decimal" placeholder="0"
            value={shares} onChange={(e) => { setShares(decimal(e.target.value, 4)); setPlaced(null); }} />
          {side === "sell" ? (
            <button type="button" className="mt-1.5 text-xs text-muted hover:text-bronze disabled:hover:text-muted"
              disabled={!heldShares} onClick={() => setShares(String(heldShares))}>
              Fund holds {formatNumber(heldShares || 0)} shares{heldShares ? ". Sell all" : ""}
            </button>
          ) : null}
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="fund-limit" className="field-label">Limit price</label>
            {Number.isFinite(price) ? (
              <button type="button" className="mb-1.5 text-xs text-muted hover:text-bronze" onClick={() => setLimit(price.toFixed(2))}>
                Use last price {formatCurrency(price)}
              </button>
            ) : null}
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
            <input id="fund-limit" className="field tabular pl-7 text-right" inputMode="decimal" placeholder="0.00"
              value={limit} onChange={(e) => { setLimit(decimal(e.target.value, 2)); setPlaced(null); }} />
          </div>
          {farFromMarket ? (
            <p className="mt-1.5 text-xs text-bronze">This limit is more than 10% from the last price, so it may not fill soon.</p>
          ) : null}
        </div>

        <dl className="space-y-2 rounded-btn border border-line bg-basalt/60 p-3.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{side === "buy" ? "Estimated cost" : "Estimated proceeds"}</dt>
            <dd className="tabular font-medium text-marble">{formatCurrency(total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Fund cash available</dt>
            <dd className="tabular text-marble">{formatCurrency(cash)}</dd>
          </div>
          {side === "buy" ? (
            <div className="flex justify-between">
              <dt className="text-muted">Cash after order</dt>
              <dd className={`tabular ${cashAfter < 0 ? "text-loss" : "text-marble"}`}>{formatCurrency(cashAfter)}</dd>
            </div>
          ) : null}
        </dl>

        {touched && problem ? <p className="text-sm text-loss" role="alert">{problem}</p> : null}
        {error ? <p className="text-sm text-loss" role="alert">{error}</p> : null}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? <span className="loading loading-spinner loading-xs" /> : null}
          Place {side} limit order
        </button>

        {placed ? (
          <div className="rounded-btn border border-gain/30 bg-gain/10 p-3.5 text-sm" role="status">
            <p className="text-marble">
              {placed.side === "buy" ? "Buy" : "Sell"} order for {formatNumber(placed.qty)} {symbol} at {formatCurrency(placed.limitPrice)}{" "}
              {placed.status === "filled" ? "filled." : "placed."}
            </p>
            <Link href="/fundFinances" className="mt-1 inline-block text-xs text-bronze hover:underline">View fund orders</Link>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-muted">
            Orders stay open until filled or canceled. A buy order&apos;s cost is set aside from the fund&apos;s cash
            when it is placed and returned if you cancel it.
          </p>
        )}
      </form>
    </section>
  );
}
