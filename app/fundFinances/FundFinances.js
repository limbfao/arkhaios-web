"use client";

// Fund finances: value chart, cash, positions and the fund's order history

import { useRouter } from "next/navigation";
import { useState } from "react";
import useFetch from "../hooks/useFetch";
import { Panel } from "../components/ui";
import { changeColor, formatCurrency, formatPercent, formatSignedCurrency } from "../lib/format";
import { FundValueChart, StageBadge, SymbolTag, termInfo } from "../funds-home/fundKit";
import FundHoldings, { summarize } from "./FundHoldings";
import FundOrders from "./fundOrders";

export default function FundFinances({ fund }) {
  const router = useRouter();
  const positions = useFetch(`/api/positions?fund=${encodeURIComponent(fund.fundID)}`);
  const summary = summarize(positions.responseJSON?.data, fund.availableBalance);

  return (
    <div className="page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <SymbolTag symbol={fund.fundSymbol} />
            <StageBadge stage={termInfo(fund).stage} />
          </div>
          <h1 className="page-title truncate">Fund finances</h1>
          <p className="mt-1.5 text-sm text-muted">Positions, cash and orders for {fund.fundName}.</p>
        </div>
        <TradeSearch />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FundValueChart symbol={fund.fundSymbol} title="Assets under management" height={300} />
        </div>
        <Panel title="Cash and buying power">
          <dl className="space-y-4">
            <Row label="Available cash" value={formatCurrency(summary.cash)} strong />
            <Row label="Invested in positions" value={positions.isLoading ? "…" : formatCurrency(summary.invested)} />
            <Row label="Unrealized P/L" value={positions.isLoading ? "…" : (
              <span className={changeColor(summary.pl)}>{formatSignedCurrency(summary.pl)}</span>
            )} />
            <Row label="Today" value={positions.isLoading ? "…" : (
              <span className={changeColor(summary.dayChange)}>{formatSignedCurrency(summary.dayChange)}</span>
            )} />
            <Row label="Cash share of AUM"
              value={formatPercent(summary.total ? summary.cash / summary.total : 0, { signed: false, digits: 1 })} />
          </dl>
          <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
            Funds trade with limit orders only. The cost of a buy order is set aside from available cash
            when the order is placed.
          </p>
        </Panel>
      </div>

      <Panel className="mt-6" title="Positions" bodyClassName="pb-1"
        actions={<span className="text-sm text-muted">{summary.list.length} holdings</span>}>
        <FundHoldings detailed positions={positions.responseJSON?.data} cash={fund.availableBalance}
          isLoading={positions.isLoading} error={positions.error} onRetry={positions.reload} />
      </Panel>

      <div className="mt-6">
        <FundOrders fundID={fund.fundID} onChange={() => router.refresh()} />
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`tabular text-right ${strong ? "text-xl font-semibold text-marble" : "text-sm text-marble"}`}>{value}</dd>
    </div>
  );
}

// Jump to the fund trading ticket for a symbol
function TradeSearch() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const s = symbol.trim().toUpperCase();
        if (s) router.push(`/fundMarkets/stocks/${encodeURIComponent(s)}`);
        else document.getElementById("fund-trade-symbol")?.focus();
      }}
    >
      <label htmlFor="fund-trade-symbol" className="sr-only">Symbol to trade</label>
      <input id="fund-trade-symbol" className="field w-40 py-2" placeholder="Symbol, e.g. AAPL" value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z.]/g, ""))} maxLength={8} />
      <button type="submit" className="btn btn-primary btn-sm">Trade for fund</button>
    </form>
  );
}
