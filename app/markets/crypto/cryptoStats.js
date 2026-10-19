"use client";

import { useMemo } from "react";
import useFetch from "../../hooks/useFetch";
import { ErrorState, Skeleton, Panel } from "../../components/ui";
import { changeColor, formatCurrency, formatPercent } from "../../lib/format";
import { toPoints } from "../components/chartConfig";

function Stat({ label, value, className = "text-marble" }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`tabular mt-1 text-sm font-medium ${className}`}>{value ?? "—"}</dd>
    </div>
  );
}

function rangeOf(points) {
  if (!points.length) return null;
  const values = points.map((p) => p.value);
  return { low: Math.min(...values), high: Math.max(...values), first: values[0], last: values[values.length - 1] };
}

// Market statistics for a crypto asset, derived from its price history
export default function CryptoStats({ symbol, previousClose }) {
  const day = useFetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=1d&interval=5m`);
  const year = useFetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=1y&interval=1d`);

  const d = useMemo(() => rangeOf(toPoints(day.responseJSON?.data?.timestamps, day.responseJSON?.data?.closes)), [day.responseJSON]);
  const y = useMemo(() => rangeOf(toPoints(year.responseJSON?.data?.timestamps, year.responseJSON?.data?.closes)), [year.responseJSON]);

  let body;
  if (day.isLoading || year.isLoading) {
    body = (
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-24" /></div>
        ))}
      </div>
    );
  } else if (day.error && year.error) {
    body = <ErrorState message="Market statistics couldn't be loaded." onRetry={() => { day.reload(); year.reload(); }} />;
  } else {
    const yearChange = y ? y.last / y.first - 1 : null;
    body = (
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
        <Stat label="Previous close" value={formatCurrency(previousClose)} />
        <Stat label="Today's range" value={d ? `${formatCurrency(d.low)} – ${formatCurrency(d.high)}` : null} />
        <Stat label="52-week range" value={y ? `${formatCurrency(y.low)} – ${formatCurrency(y.high)}` : null} />
        <Stat label="1-year change" value={formatPercent(yearChange)} className={changeColor(yearChange)} />
      </dl>
    );
  }

  return <Panel title="Market statistics">{body}</Panel>;
}
