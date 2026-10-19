"use client";

import useFetch from "../../hooks/useFetch";
import { ErrorState, Skeleton, Panel } from "../../components/ui";
import { formatCurrency, formatPercent } from "../../lib/format";

function num(value) {
  return Number.isFinite(value) ? value : null;
}

function Stat({ label, value, hint }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular mt-1 text-sm font-medium text-marble">{value ?? "—"}</dd>
      {hint ? <dd className="mt-0.5 text-xs text-muted">{hint}</dd> : null}
    </div>
  );
}

function RangeBar({ low, high, price }) {
  if (![low, high, price].every(Number.isFinite) || high <= low) return null;
  const pct = Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100));
  return (
    <div className="mt-2 h-1 w-full rounded-full bg-slate" aria-hidden="true">
      <div className="relative h-1 rounded-full bg-bronze/40" style={{ width: `${pct}%` }}>
        <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-bronze" />
      </div>
    </div>
  );
}

// Key statistics from Finnhub basic financials (marketCapitalization is in millions)
export default function StockStats({ symbol, price }) {
  const { responseJSON, isLoading, error, reload } = useFetch("/api/company-financials?symbol=" + encodeURIComponent(symbol));
  const m = responseJSON?.data?.metric || {};

  const low = num(m["52WeekLow"]);
  const high = num(m["52WeekHigh"]);
  const marketCap = num(m.marketCapitalization);
  const volume = num(m["10DayAverageTradingVolume"]);

  let body;
  if (isLoading) {
    body = (
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  } else if (error) {
    body = <ErrorState message="Key statistics couldn't be loaded." onRetry={reload} />;
  } else {
    body = (
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
        <Stat label="Market cap" value={marketCap !== null ? formatCurrency(marketCap * 1e6, { compact: true }) : null} />
        <Stat label="P/E ratio (TTM)" value={num(m.peTTM)?.toFixed(2)} />
        <Stat label="EPS (TTM)" value={num(m.epsTTM) !== null ? formatCurrency(m.epsTTM) : null} />
        <Stat label="Dividend yield" value={num(m.dividendYieldIndicatedAnnual) !== null ? formatPercent(m.dividendYieldIndicatedAnnual, { isPercent: true, signed: false }) : null} />
        <Stat label="Beta" value={num(m.beta)?.toFixed(2)} />
        <Stat label="Avg. volume (10 day)" value={volume !== null ? `${volume.toFixed(1)}M` : null} />
        <Stat label="Net margin (TTM)" value={num(m.netProfitMarginTTM) !== null ? formatPercent(m.netProfitMarginTTM, { isPercent: true, signed: false }) : null} />
        <div>
          <dt className="text-xs text-muted">52-week range</dt>
          <dd className="tabular mt-1 text-sm font-medium text-marble">
            {low !== null && high !== null ? `${formatCurrency(low)} – ${formatCurrency(high)}` : "—"}
          </dd>
          <dd><RangeBar low={low} high={high} price={price} /></dd>
        </div>
      </dl>
    );
  }

  return <Panel title="Key statistics">{body}</Panel>;
}
