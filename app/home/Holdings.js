"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useFetch from "../hooks/useFetch";
import { AssetLogo, EmptyState, ErrorState, Panel, SkeletonRows } from "../components/ui";
import { changeColor, formatCurrency, formatNumber, formatPercent, formatSignedCurrency } from "../lib/format";
import Sparkline from "../markets/components/Sparkline";
import { assetHref, displaySymbol, toChartSymbol } from "../markets/components/symbols";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "us_equity", label: "Stocks" },
  { key: "crypto", label: "Crypto" },
];

function FilterTabs({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Filter holdings" className="inline-flex rounded-btn border border-line bg-basalt p-0.5">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          role="tab"
          aria-selected={value === f.key}
          onClick={() => onChange(f.key)}
          className={`rounded-[0.4rem] px-2.5 py-1 text-xs font-medium transition-colors ${value === f.key ? "bg-slate text-marble" : "text-muted hover:text-marble"}`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

// The user's open positions, largest first
export default function Holdings({ positions, isLoading, error, onRetry }) {
  const [filter, setFilter] = useState("all");
  const symbols = (positions || []).map((p) => toChartSymbol(p.symbol));
  const snapshot = useFetch(symbols.length ? "/api/market/snapshot?symbols=" + symbols.join(",") : null);
  const sparks = Object.fromEntries((snapshot.responseJSON?.data || []).map((s) => [s.symbol, s]));

  const rows = useMemo(
    () =>
      (positions || [])
        .filter((p) => filter === "all" || p.asset_class === filter)
        .sort((a, b) => parseFloat(b.market_value) - parseFloat(a.market_value)),
    [positions, filter]
  );
  const total = (positions || []).reduce((sum, p) => sum + parseFloat(p.market_value || 0), 0);

  let body;
  if (isLoading) body = <div className="p-5"><SkeletonRows rows={5} /></div>;
  else if (error) body = <ErrorState message="Your holdings couldn't be loaded." onRetry={onRetry} />;
  else if (!positions?.length)
    body = (
      <EmptyState
        title="You don't own any investments yet"
        description="Find a stock or crypto you believe in and place your first order."
        action={<Link href="/markets" className="btn btn-primary btn-sm">Explore markets</Link>}
      />
    );
  else if (!rows.length) body = <EmptyState title={`No ${filter === "crypto" ? "crypto" : "stock"} holdings`} />;
  else
    body = (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th scope="col" className="px-5 py-2.5 text-left font-normal">Asset</th>
              <th scope="col" className="hidden px-3 py-2.5 text-left font-normal md:table-cell">Today</th>
              <th scope="col" className="px-3 py-2.5 text-right font-normal">Price</th>
              <th scope="col" className="px-3 py-2.5 text-right font-normal">Value</th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-normal sm:table-cell">Today's return</th>
              <th scope="col" className="px-5 py-2.5 text-right font-normal">Total return</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => {
              const symbol = toChartSymbol(p.symbol);
              const spark = sparks[symbol];
              const isCrypto = p.asset_class === "crypto";
              return (
                <tr key={p.asset_id || p.symbol} className="relative transition-colors hover:bg-slate/60">
                  <td className="px-5 py-3">
                    <Link href={assetHref(symbol)} className="flex items-center gap-3 after:absolute after:inset-0">
                      <AssetLogo symbol={symbol} size={32} />
                      <span>
                        <span className="block font-medium text-marble">{displaySymbol(symbol)}</span>
                        <span className="tabular block text-xs text-muted">
                          {formatNumber(p.qty, { digits: isCrypto ? 8 : 4 })} {isCrypto ? displaySymbol(symbol) : parseFloat(p.qty) === 1 ? "share" : "shares"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <Sparkline
                      values={spark?.sparkline}
                      reference={spark?.previousClose}
                      up={parseFloat(p.unrealized_intraday_plpc) >= 0}
                      width={88}
                      height={28}
                    />
                  </td>
                  <td className="px-3 py-3 text-right text-marble">{formatCurrency(p.current_price)}</td>
                  <td className="px-3 py-3 text-right font-medium text-marble">{formatCurrency(p.market_value)}</td>
                  <td className={`hidden px-3 py-3 text-right sm:table-cell ${changeColor(p.unrealized_intraday_pl)}`}>
                    <span className="block">{formatSignedCurrency(p.unrealized_intraday_pl)}</span>
                    <span className="block text-xs">{formatPercent(p.unrealized_intraday_plpc)}</span>
                  </td>
                  <td className={`px-5 py-3 text-right ${changeColor(p.unrealized_pl)}`}>
                    <span className="block">{formatSignedCurrency(p.unrealized_pl)}</span>
                    <span className="block text-xs">{formatPercent(p.unrealized_plpc)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

  return (
    <Panel
      title={
        positions?.length ? (
          <span>
            Holdings <span className="tabular ml-1 font-normal text-muted">{formatCurrency(total)}</span>
          </span>
        ) : (
          "Holdings"
        )
      }
      actions={positions?.length ? <FilterTabs value={filter} onChange={setFilter} /> : null}
      bodyClassName=""
    >
      {body}
    </Panel>
  );
}
