"use client";

// Fund positions: an allocation bar plus a holdings table. `detailed` adds avg price,
// current price and cost columns (finances page); the console shows the compact version.

import Link from "next/link";
import { AssetLogo, EmptyState, ErrorState, SkeletonRows } from "../components/ui";
import { changeColor, formatCurrency, formatNumber, formatPercent, formatSignedCurrency } from "../lib/format";

// Muted, distinguishable tones that sit on the stone surface; cash is always the last, neutral swatch
const TONES = ["#c9a36a", "#7fa7a0", "#a58fb8", "#c98a6a", "#8fa86e", "#6f8fb5", "#b8a27a", "#9c7f6a"];
const CASH_TONE = "#4a443c";

export function summarize(positions, cash) {
  const list = (positions || []).map((p) => ({
    ...p,
    shares: parseFloat(p.shares ?? p.qty) || 0,
    price: parseFloat(p.current_price) || 0,
    avg: parseFloat(p.avg_entry_price) || 0,
    value: parseFloat(p.market_value) || 0,
    cost: parseFloat(p.cost_basis) || 0,
    pl: parseFloat(p.unrealized_pl) || 0,
    plpc: parseFloat(p.unrealized_plpc) || 0,
    dayChange: p.lastday_price != null
      ? ((parseFloat(p.current_price) || 0) - parseFloat(p.lastday_price)) * (parseFloat(p.shares ?? p.qty) || 0)
      : 0,
  })).sort((a, b) => b.value - a.value);
  const invested = list.reduce((n, p) => n + p.value, 0);
  const cashValue = parseFloat(cash) || 0;
  const total = invested + cashValue;
  const dayChange = list.reduce((n, p) => n + p.dayChange, 0);
  const pl = list.reduce((n, p) => n + p.pl, 0);
  return { list, invested, cash: cashValue, total, dayChange, pl };
}

export function AllocationBar({ summary }) {
  const { list, cash, total } = summary;
  if (!total) return null;
  const segments = [
    ...list.map((p, i) => ({ key: p.symbol, label: p.symbol, value: p.value, color: TONES[i % TONES.length] })),
    { key: "cash", label: "Cash", value: cash, color: CASH_TONE },
  ].filter((s) => s.value > 0);

  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-basalt" role="img"
        aria-label={segments.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(", ")}>
        {segments.map((s) => (
          <div key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            className="h-full border-r border-stone last:border-r-0" />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
            <span className="text-marble">{s.label}</span>
            <span className="tabular">{formatPercent(s.value / total, { signed: false, digits: 1 })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FundHoldings({ positions, cash, isLoading, error, onRetry, detailed = false, tradeHref }) {
  if (isLoading) return <div className="p-5"><SkeletonRows rows={4} /></div>;
  if (error) return <ErrorState message="Positions couldn't be loaded." onRetry={onRetry} />;

  const summary = summarize(positions, cash);
  const hrefFor = tradeHref || ((symbol) => `/fundMarkets/stocks/${encodeURIComponent(symbol)}`);

  return (
    <div>
      <div className="px-5 pt-5">
        <AllocationBar summary={summary} />
      </div>
      {summary.list.length === 0 ? (
        <EmptyState
          title="No positions yet"
          description="Search for a stock and place a limit order on behalf of the fund to start building positions."
        />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-y border-line text-left text-xs text-muted">
                <th scope="col" className="px-5 py-2.5 font-medium">Symbol</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Shares</th>
                {detailed ? <th scope="col" className="px-3 py-2.5 text-right font-medium">Avg price</th> : null}
                {detailed ? <th scope="col" className="px-3 py-2.5 text-right font-medium">Price</th> : null}
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Market value</th>
                {!detailed ? <th scope="col" className="px-3 py-2.5 text-right font-medium">Weight</th> : null}
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Total P/L</th>
              </tr>
            </thead>
            <tbody>
              {summary.list.map((p) => (
                <tr key={p.symbol} className="border-b border-line/60 transition-colors hover:bg-slate/40">
                  <td className="px-5 py-3">
                    <Link href={hrefFor(p.symbol)} className="flex items-center gap-3 hover:text-bronze">
                      <AssetLogo symbol={p.symbol} size={28} />
                      <span className="font-medium text-marble">{p.symbol}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right text-marble">{formatNumber(p.shares)}</td>
                  {detailed ? <td className="px-3 py-3 text-right text-muted">{formatCurrency(p.avg)}</td> : null}
                  {detailed ? <td className="px-3 py-3 text-right text-marble">{formatCurrency(p.price)}</td> : null}
                  <td className="px-3 py-3 text-right text-marble">{formatCurrency(p.value)}</td>
                  {!detailed ? (
                    <td className="px-3 py-3 text-right text-muted">
                      {formatPercent(summary.total ? p.value / summary.total : 0, { signed: false, digits: 1 })}
                    </td>
                  ) : null}
                  <td className="px-5 py-3 text-right">
                    <div className={`tabular ${changeColor(p.pl)}`}>{formatSignedCurrency(p.pl)}</div>
                    <div className={`tabular text-xs ${changeColor(p.plpc)}`}>{formatPercent(p.plpc)}</div>
                  </td>
                </tr>
              ))}
              <tr className="text-muted">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-basalt text-[10px] font-semibold">$</span>
                    <span className="text-marble">Cash</span>
                  </span>
                </td>
                <td className="px-3 py-3" />
                {detailed ? <td className="px-3 py-3" /> : null}
                {detailed ? <td className="px-3 py-3" /> : null}
                <td className="px-3 py-3 text-right text-marble">{formatCurrency(summary.cash)}</td>
                {!detailed ? (
                  <td className="px-3 py-3 text-right">
                    {formatPercent(summary.total ? summary.cash / summary.total : 0, { signed: false, digits: 1 })}
                  </td>
                ) : null}
                <td className="px-5 py-3" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
