"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ErrorState, Skeleton } from "../components/ui";
import { changeColor, formatCurrency, formatPercent, formatSignedCurrency } from "../lib/format";
import PriceChart from "../markets/components/PriceChart";
import RangeTabs from "../markets/components/RangeTabs";
import { PORTFOLIO_RANGES, hoverLabel, toPoints } from "../markets/components/chartConfig";

function usePortfolioHistory(range) {
  const [state, setState] = useState({ points: [], isLoading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period: range.period, timeframe: range.timeframe }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !data?.data?.history) throw new Error(data?.message || "history unavailable");
        const history = data.data.history;
        // Skip the zero-equity stretch before the account was funded
        const points = toPoints(history.timestamp, history.equity);
        const firstFunded = points.findIndex((p) => p.value > 0);
        if (!cancelled) setState({ points: firstFunded > 0 ? points.slice(firstFunded) : points, isLoading: false, error: null });
      })
      .catch((error) => !cancelled && setState({ points: [], isLoading: false, error }));
    return () => {
      cancelled = true;
    };
  }, [range.period, range.timeframe, attempt]);

  return { ...state, reload: () => setAttempt((n) => n + 1) };
}

function SideStat({ label, value, className = "text-marble", loading }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3 lg:block lg:py-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`stat-value text-base font-semibold lg:mt-1 lg:text-xl ${className}`}>
        {loading ? <Skeleton className="h-6 w-28" /> : value}
      </dd>
    </div>
  );
}

// Portfolio value with a range chart, plus account balances
export default function PortfolioHero({ trading, tradingLoading }) {
  const [rangeKey, setRangeKey] = useState("1D");
  const [hover, setHover] = useState(null);
  const range = PORTFOLIO_RANGES.find((r) => r.key === rangeKey);
  const { points, isLoading, error, reload } = usePortfolioHistory(range);

  const equity = trading ? parseFloat(trading.equity) : null;
  const lastEquity = trading ? parseFloat(trading.last_equity) : null;

  // 1D compares with yesterday's close; longer ranges with the first point in the range
  const base = rangeKey === "1D" && Number.isFinite(lastEquity) ? lastEquity : points[0]?.value;
  const current = hover?.value ?? (Number.isFinite(equity) ? equity : points[points.length - 1]?.value);
  const change = Number.isFinite(current) && Number.isFinite(base) ? current - base : null;
  const changePct = change !== null && base ? change / base : null;
  const dayChange = Number.isFinite(equity) && Number.isFinite(lastEquity) ? equity - lastEquity : null;

  const chartData = useMemo(() => points, [points]);

  return (
    <section className="panel grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]" aria-label="Portfolio">
      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6">
          <div>
            <h2 className="text-sm text-muted">Portfolio value</h2>
            {Number.isFinite(current) ? (
              <>
                <div className="stat-value mt-1 text-4xl font-semibold tracking-tight text-marble">{formatCurrency(current)}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm">
                  <span className={`tabular font-medium ${changeColor(change)}`}>
                    {formatSignedCurrency(change)} ({formatPercent(changePct)})
                  </span>
                  <span className="text-muted">{hover ? hoverLabel(hover.time, range.intraday) : range.label}</span>
                </div>
              </>
            ) : (
              <div className="mt-2 space-y-2">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-4 w-40" />
              </div>
            )}
          </div>
          <RangeTabs ranges={PORTFOLIO_RANGES} value={rangeKey} onChange={(k) => { setHover(null); setRangeKey(k); }} />
        </div>
        <div className="relative px-2 pb-3 pt-4">
          {error ? (
            <div className="flex h-[300px] items-center justify-center">
              <ErrorState message="Portfolio history couldn't be loaded." onRetry={reload} />
            </div>
          ) : (
            <>
              <PriceChart
                data={chartData}
                intraday={range.intraday}
                height={300}
                reference={rangeKey === "1D" && Number.isFinite(lastEquity) ? lastEquity : undefined}
                onHover={setHover}
              />
              {isLoading ? (
                <div className="absolute inset-x-5 bottom-3 top-4">
                  <Skeleton className="h-full w-full opacity-40" />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col justify-between border-t border-line p-6 lg:border-l lg:border-t-0">
        <dl className="divide-y divide-line lg:space-y-6 lg:divide-y-0">
          <SideStat
            label="Today's change"
            loading={tradingLoading}
            value={dayChange !== null ? `${formatSignedCurrency(dayChange)} (${formatPercent(lastEquity ? dayChange / lastEquity : null)})` : "—"}
            className={changeColor(dayChange)}
          />
          <SideStat label="Buying power" loading={tradingLoading} value={formatCurrency(trading?.buying_power)} />
          <SideStat label="Cash" loading={tradingLoading} value={formatCurrency(trading?.cash)} />
          <SideStat label="Invested" loading={tradingLoading} value={formatCurrency(trading?.long_market_value)} />
        </dl>
        <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-1">
          <Link href="/account/transfers" className="btn btn-primary btn-sm">Deposit funds</Link>
          <Link href="/markets" className="btn btn-ghost btn-sm border border-line">Explore markets</Link>
        </div>
      </div>
    </section>
  );
}
