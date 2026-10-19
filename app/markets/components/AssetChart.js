"use client";

import { useMemo, useState } from "react";
import useFetch from "../../hooks/useFetch";
import { ErrorState, Skeleton } from "../../components/ui";
import { changeColor, formatCurrency, formatPercent, formatSignedCurrency } from "../../lib/format";
import PriceChart from "./PriceChart";
import RangeTabs from "./RangeTabs";
import { SYMBOL_RANGES, hoverLabel, toPoints } from "./chartConfig";
import { toChartSymbol } from "./symbols";

// Price headline, range chart and range tabs for one stock or crypto symbol.
// `previousClose` (from the quote) anchors the 1D change; other ranges compare to the first point.
export default function AssetChart({ symbol, previousClose, price, isCrypto = false }) {
  const [rangeKey, setRangeKey] = useState("1D");
  const [hover, setHover] = useState(null);
  const range = SYMBOL_RANGES.find((r) => r.key === rangeKey);

  const { responseJSON, isLoading, error, reload } = useFetch(
    `/api/chart?symbol=${encodeURIComponent(toChartSymbol(symbol))}&range=${range.range}&interval=${range.interval}`
  );

  const points = useMemo(
    () => toPoints(responseJSON?.data?.timestamps, responseJSON?.data?.closes),
    [responseJSON]
  );
  const hasData = !isLoading && !error && points.length > 1;

  const base = rangeKey === "1D" && Number.isFinite(previousClose) ? previousClose : points[0]?.value;
  const last = points[points.length - 1]?.value;
  // Off the chart, show the live quote so the headline matches the order ticket
  const shown = hover?.value ?? (Number.isFinite(price) ? price : last);
  const change = Number.isFinite(shown) && Number.isFinite(base) ? shown - base : null;
  const changePct = change !== null && base ? change / base : null;

  return (
    <div className="panel" aria-label="Price chart">
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-5">
        <div>
          {hasData || Number.isFinite(shown) ? (
            <>
              <div className="stat-value text-4xl font-semibold tracking-tight text-marble">{formatCurrency(shown)}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm">
                <span className={`tabular font-medium ${changeColor(change)}`}>
                  {formatSignedCurrency(change)} ({formatPercent(changePct)})
                </span>
                <span className="text-muted">
                  {hover ? hoverLabel(hover.time, range.intraday) : isCrypto && range.key === "1D" ? "Past 24 hours" : range.label}
                </span>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-4 w-48" />
            </div>
          )}
        </div>
        <RangeTabs ranges={SYMBOL_RANGES} value={rangeKey} onChange={(k) => { setHover(null); setRangeKey(k); }} />
      </div>

      <div className="relative px-2 pb-3 pt-4">
        {error ? (
          <div className="flex h-[340px] items-center justify-center">
            <ErrorState message="Price history couldn't be loaded." onRetry={reload} />
          </div>
        ) : (
          <>
            <PriceChart
              data={points}
              intraday={range.intraday}
              height={340}
              reference={rangeKey === "1D" ? previousClose : undefined}
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
  );
}
