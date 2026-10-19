"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { Skeleton } from "../../components/ui";
import { formatCurrency, formatNumber } from "../../lib/format";
import { displaySymbol, toOrderSymbol } from "./symbols";

function Segmented({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-flow-col auto-cols-fr rounded-btn border border-line bg-basalt p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`rounded-[0.4rem] px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            value === o.value ? "bg-slate text-marble" : "text-muted hover:text-marble"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children, strong }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className={`tabular ${strong ? "font-semibold text-marble" : "text-marble"}`}>{children}</span>
    </div>
  );
}

function sanitize(value, decimals) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (!rest.length) return whole;
  return `${whole}.${rest.join("").slice(0, decimals)}`;
}

function capitalize(text = "") {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Buy/sell ticket for a stock or crypto asset
export default function OrderTicket({ symbol, price, isCrypto, verified, trading, tradingLoading, position, onPlaced }) {
  const id = useId();
  const ticker = displaySymbol(symbol);
  const [side, setSide] = useState("buy");
  const [type, setType] = useState("market");
  const [unit, setUnit] = useState("shares");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ok, message }

  // Dollar amounts only apply to market orders
  useEffect(() => {
    if (type === "limit") setUnit("shares");
    if (type === "limit" && !limitPrice && Number.isFinite(price)) setLimitPrice(price.toFixed(2));
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!result?.ok) return;
    const t = setTimeout(() => setResult(null), 8000);
    return () => clearTimeout(t);
  }, [result]);

  const qtyLabel = isCrypto ? ticker : "shares";
  const amountNum = parseFloat(amount);
  const execPrice = type === "limit" ? parseFloat(limitPrice) : price;
  const validAmount = Number.isFinite(amountNum) && amountNum > 0;
  const validPrice = Number.isFinite(execPrice) && execPrice > 0;

  const estShares = unit === "dollars" ? (validAmount && validPrice ? amountNum / execPrice : null) : validAmount ? amountNum : null;
  const estTotal = unit === "dollars" ? (validAmount ? amountNum : null) : validAmount && validPrice ? amountNum * execPrice : null;

  const buyingPower = trading ? parseFloat(trading.buying_power) : null;
  const heldQty = position ? parseFloat(position.qty_available ?? position.qty) : 0;

  let problem = null;
  if (validAmount && estTotal !== null) {
    if (side === "buy" && Number.isFinite(buyingPower) && estTotal > buyingPower) {
      problem = "This order is more than your buying power.";
    } else if (side === "sell" && estShares !== null && estShares > heldQty + 1e-9) {
      problem = heldQty > 0 ? `You can sell up to ${formatNumber(heldQty, { digits: 8 })} ${qtyLabel}.` : `You don't own any ${ticker}.`;
    }
  }
  if (type === "limit" && limitPrice !== "" && !validPrice) problem = "Enter a limit price above zero.";

  const canSubmit = verified && validAmount && validPrice && !problem && !submitting;

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);

    const payload = {
      symbol: toOrderSymbol(symbol),
      type,
      side,
      qty: amount,
      transaction: unit,
    };
    if (type === "limit") payload.price = limitPrice;

    try {
      const response = await fetch("/api/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.status === "success") {
        const order = data.data || {};
        const noun = isCrypto ? ticker : amountNum === 1 ? "share" : "shares";
        const what = unit === "dollars" ? `${formatCurrency(amountNum)} of ${ticker}` : `${formatNumber(amountNum, { digits: 8 })} ${noun}${isCrypto ? "" : ` of ${ticker}`}`;
        const filled = order.status === "filled" && order.filled_avg_price;
        setResult({
          ok: true,
          message: filled
            ? `${side === "buy" ? "Bought" : "Sold"} ${what} at ${formatCurrency(order.filled_avg_price)}.`
            : `Your ${type} order to ${side} ${what} is open. You'll see it in your order history.`,
        });
        setAmount("");
        onPlaced?.();
      } else {
        setResult({ ok: false, message: capitalize(data.message || "The order couldn't be placed.") + (/[.!?]$/.test(data.message || "") ? "" : ".") });
      }
    } catch {
      setResult({ ok: false, message: "We couldn't reach the server. Check your connection and try again." });
    }
    setSubmitting(false);
  }

  return (
    <div className="panel" aria-labelledby={`${id}-title`}>
      <div className="panel-header">
        <h2 id={`${id}-title`} className="panel-title">Trade {ticker}</h2>
        {Number.isFinite(price) ? <span className="tabular text-sm text-muted">{formatCurrency(price)}</span> : null}
      </div>

      {!verified ? (
        <div className="p-5">
          <p className="text-sm text-marble">Verify your identity to trade {ticker}.</p>
          <p className="mt-1 text-sm text-muted">It takes a few minutes, and you can keep watching markets in the meantime.</p>
          <Link href="/account/settings/personal-information" className="btn btn-primary btn-sm mt-4 w-full">
            Verify identity
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 p-5" noValidate>
          <Segmented
            label="Order side"
            value={side}
            onChange={(v) => { setSide(v); setResult(null); }}
            options={[{ value: "buy", label: "Buy" }, { value: "sell", label: "Sell" }]}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-type`} className="field-label">Order type</label>
              <select id={`${id}-type`} className="field" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="market">Market</option>
                <option value="limit">Limit</option>
              </select>
            </div>
            <div>
              <span className="field-label" id={`${id}-unit`}>Amount in</span>
              <Segmented
                label="Amount in"
                value={unit}
                onChange={(v) => { setUnit(v); setAmount(""); }}
                options={[
                  { value: "shares", label: isCrypto ? ticker : "Shares" },
                  { value: "dollars", label: "USD", disabled: type === "limit" },
                ]}
              />
            </div>
          </div>

          {type === "limit" ? (
            <div>
              <label htmlFor={`${id}-limit`} className="field-label">Limit price</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
                <input
                  id={`${id}-limit`}
                  className="field tabular pl-7"
                  inputMode="decimal"
                  autoComplete="off"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(sanitize(e.target.value, 2))}
                />
              </div>
            </div>
          ) : null}

          <div>
            <label htmlFor={`${id}-amount`} className="field-label">
              {unit === "dollars" ? "Amount" : isCrypto ? `Quantity (${ticker})` : "Shares"}
            </label>
            <div className="relative">
              {unit === "dollars" ? (
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
              ) : null}
              <input
                id={`${id}-amount`}
                className={`field tabular ${unit === "dollars" ? "pl-7" : ""}`}
                inputMode="decimal"
                autoComplete="off"
                placeholder={unit === "dollars" ? "0.00" : "0"}
                value={amount}
                onChange={(e) => { setAmount(sanitize(e.target.value, unit === "dollars" ? 2 : isCrypto ? 8 : 4)); setResult(null); }}
              />
            </div>
          </div>

          <div className="border-t border-line pt-3">
            <Row label={type === "limit" ? "Limit price" : "Market price"}>{validPrice ? formatCurrency(execPrice) : "—"}</Row>
            {unit === "dollars" ? (
              <Row label={`Estimated ${isCrypto ? ticker : "shares"}`}>{estShares !== null ? formatNumber(estShares, { digits: isCrypto ? 8 : 4 }) : "—"}</Row>
            ) : (
              <Row label={side === "buy" ? "Estimated cost" : "Estimated credit"} strong>{estTotal !== null ? formatCurrency(estTotal) : "—"}</Row>
            )}
            {side === "buy" ? (
              <Row label="Buying power">
                {tradingLoading ? <Skeleton className="h-4 w-20" /> : formatCurrency(buyingPower)}
              </Row>
            ) : (
              <Row label={isCrypto ? `${ticker} available` : "Shares available"}>{formatNumber(heldQty, { digits: 8 })}</Row>
            )}
          </div>

          {problem ? <p className="text-sm text-loss" role="alert">{problem}</p> : null}

          <button type="submit" className="btn btn-primary w-full" disabled={!canSubmit}>
            {submitting ? <span className="loading loading-spinner loading-sm" aria-hidden="true" /> : null}
            {submitting ? "Placing order" : side === "buy" ? "Place buy order" : "Place sell order"}
          </button>

          {result ? (
            <div
              role={result.ok ? "status" : "alert"}
              className={`flex gap-2.5 rounded-btn border px-3.5 py-3 text-sm ${
                result.ok ? "border-gain/30 bg-gain/10 text-marble" : "border-loss/30 bg-loss/10 text-marble"
              }`}
            >
              {result.ok ? (
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-gain" aria-hidden="true" />
              ) : (
                <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-loss" aria-hidden="true" />
              )}
              <span>{result.message}</span>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-muted">
              {type === "market"
                ? "Market orders fill at the best available price, which may differ slightly from the price shown."
                : "Limit orders stay open until the price reaches your limit or you cancel them."}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
